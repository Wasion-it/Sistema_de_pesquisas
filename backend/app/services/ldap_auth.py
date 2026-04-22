from __future__ import annotations

import ssl
from dataclasses import dataclass
import secrets
from urllib.parse import urlparse
from time import sleep

from ldap3 import ALL, ANONYMOUS, SIMPLE, SUBTREE, Connection, Server, Tls
from ldap3.core.exceptions import LDAPException
from ldap3.utils.conv import escape_filter_chars
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import RoleEnum, User
from app.models.enums import AuthenticationSourceEnum


class LdapConfigurationError(RuntimeError):
    pass


class LdapAuthenticationError(RuntimeError):
    pass


@dataclass(slots=True)
class LdapAuthenticatedUser:
    user_dn: str


@dataclass(slots=True)
class LdapDirectoryUser:
    dn: str
    email: str
    full_name: str
    username: str


def _build_tls() -> Tls:
    validate = ssl.CERT_REQUIRED if settings.ldap_validate_certificates else ssl.CERT_NONE
    return Tls(validate=validate)


def _build_server() -> Server:
    if not settings.ldap_server_uri:
        raise LdapConfigurationError("LDAP server URI is not configured")

    parsed_uri = urlparse(settings.ldap_server_uri)
    if parsed_uri.scheme:
        server_host = parsed_uri.hostname or settings.ldap_server_uri
        server_port = parsed_uri.port
    else:
        server_host = settings.ldap_server_uri
        server_port = None

    return Server(
        server_host,
        port=server_port,
        use_ssl=settings.ldap_use_ssl,
        tls=_build_tls(),
        connect_timeout=max(1, int(settings.ldap_timeout_seconds)),
        get_info=None,
    )


def _open_connection(bind_dn: str | None, bind_password: str | None) -> Connection:
    last_error: Exception | None = None

    for attempt in range(5):
        server = _build_server()
        connection = Connection(
            server,
            user=bind_dn,
            password=bind_password,
            authentication=SIMPLE if bind_dn else ANONYMOUS,
            auto_bind=False,
            receive_timeout=max(1, int(settings.ldap_timeout_seconds)),
        )

        try:
            connection.open()

            if settings.ldap_start_tls and not settings.ldap_use_ssl:
                connection.start_tls()

            if not connection.bind():
                raise LdapAuthenticationError("LDAP bind failed")

            return connection
        except LdapAuthenticationError:
            raise
        except Exception as exc:
            last_error = exc
            if attempt < 4:
                sleep(0.5 * (attempt + 1))
                continue
            break

    raise LdapAuthenticationError("LDAP connection failed") from last_error


def _build_user_dn(username: str) -> str:
    if settings.ldap_user_dn_template:
        return settings.ldap_user_dn_template.format(
            username=username,
            email=username,
        )

    if not settings.ldap_user_base_dn:
        raise LdapConfigurationError("LDAP user base DN is not configured")

    normalized_identifier = username.strip().lower()
    escaped_identifier = escape_filter_chars(normalized_identifier)

    if "@" in normalized_identifier:
        search_filter = "(|(mail={identifier})(userPrincipalName={identifier})(sAMAccountName={local_part}))".format(
            identifier=escaped_identifier,
            local_part=escape_filter_chars(normalized_identifier.split("@", maxsplit=1)[0]),
        )
    else:
        search_filter = settings.ldap_user_filter.format(
            username=escape_filter_chars(username),
            email=escape_filter_chars(username),
        )

    try:
        with _open_connection(settings.ldap_bind_dn, settings.ldap_bind_password) as connection:
            found = connection.search(
                search_base=settings.ldap_user_base_dn,
                search_filter=search_filter,
                search_scope=SUBTREE,
                attributes=["distinguishedName"],
                size_limit=2,
            )
            if not found or len(connection.entries) != 1:
                raise LdapAuthenticationError("LDAP user was not found")

            return str(connection.entries[0].entry_dn)
    except LDAPException as exc:
        raise LdapAuthenticationError("LDAP user lookup failed") from exc


def _build_directory_search_filter() -> str:
    return "(&(objectCategory=person)(objectClass=user))"


def _normalize_directory_user(entry) -> LdapDirectoryUser | None:
    attributes = entry.entry_attributes_as_dict
    mail = attributes.get("mail")
    user_principal_name = attributes.get("userPrincipalName")
    sam_account_name = attributes.get("sAMAccountName")
    display_name = attributes.get("displayName") or attributes.get("cn")

    email = None
    if isinstance(mail, list):
        email = mail[0] if mail else None
    elif isinstance(mail, str):
        email = mail

    if not email and isinstance(user_principal_name, list):
        email = user_principal_name[0] if user_principal_name else None
    elif not email and isinstance(user_principal_name, str):
        email = user_principal_name

    username = None
    if isinstance(sam_account_name, list):
        username = sam_account_name[0] if sam_account_name else None
    elif isinstance(sam_account_name, str):
        username = sam_account_name

    if not username and email:
        username = email.split("@", maxsplit=1)[0]

    if not email or not username:
        return None

    if isinstance(display_name, list):
        full_name = display_name[0] if display_name else username
    elif isinstance(display_name, str):
        full_name = display_name
    else:
        full_name = username

    return LdapDirectoryUser(
        dn=str(entry.entry_dn),
        email=str(email).strip().lower(),
        full_name=str(full_name).strip() or username,
        username=str(username).strip(),
    )


def list_directory_users_from_ou() -> list[LdapDirectoryUser]:
    if not settings.ldap_enabled:
        raise LdapConfigurationError("LDAP authentication is disabled")

    if not settings.ldap_user_base_dn:
        raise LdapConfigurationError("LDAP user base DN is not configured")

    with _open_connection(settings.ldap_bind_dn, settings.ldap_bind_password) as connection:
        found = connection.search(
            search_base=settings.ldap_user_base_dn,
            search_filter=_build_directory_search_filter(),
            search_scope=SUBTREE,
            attributes=["displayName", "cn", "mail", "userPrincipalName", "sAMAccountName"],
        )
        if not found:
            return []

        users: list[LdapDirectoryUser] = []
        for entry in connection.entries:
            normalized_user = _normalize_directory_user(entry)
            if normalized_user is not None:
                users.append(normalized_user)

        return users


def sync_directory_users_from_ou(session: Session) -> list[User]:
    directory_users = list_directory_users_from_ou()
    synced_users: list[User] = []

    for directory_user in directory_users:
        user = session.scalar(select(User).where(User.email == directory_user.email))
        if user is None:
            user = User(
                email=directory_user.email,
                full_name=directory_user.full_name,
                password_hash=secrets.token_urlsafe(32),
                role=RoleEnum.COLABORADOR,
                auth_source=AuthenticationSourceEnum.LDAP,
                is_active=True,
            )
            session.add(user)
        elif user.is_active:
            user.full_name = directory_user.full_name
            user.auth_source = AuthenticationSourceEnum.LDAP
            user.is_active = True
        else:
            continue

        synced_users.append(user)

    session.flush()
    return synced_users


def authenticate_ldap_user(username: str, password: str) -> LdapAuthenticatedUser:
    if not settings.ldap_enabled:
        raise LdapConfigurationError("LDAP authentication is disabled")

    if not password:
        raise LdapAuthenticationError("Empty password is not allowed")

    try:
        with _open_connection(username, password):
            return LdapAuthenticatedUser(user_dn=username)
    except (LDAPException, LdapAuthenticationError):
        pass

    user_dn = _build_user_dn(username)

    try:
        with _open_connection(user_dn, password):
            return LdapAuthenticatedUser(user_dn=user_dn)
    except (LDAPException, LdapAuthenticationError) as exc:
        raise LdapAuthenticationError("LDAP bind failed") from exc