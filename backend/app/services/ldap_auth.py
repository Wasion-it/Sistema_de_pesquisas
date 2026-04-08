from __future__ import annotations

import ssl
from dataclasses import dataclass

from ldap3 import ALL, ANONYMOUS, SIMPLE, SUBTREE, Connection, Server, Tls
from ldap3.core.exceptions import LDAPException
from ldap3.utils.conv import escape_filter_chars

from app.core.config import settings


class LdapConfigurationError(RuntimeError):
    pass


class LdapAuthenticationError(RuntimeError):
    pass


@dataclass(slots=True)
class LdapAuthenticatedUser:
    user_dn: str


def _build_tls() -> Tls:
    validate = ssl.CERT_REQUIRED if settings.ldap_validate_certificates else ssl.CERT_NONE
    return Tls(validate=validate)


def _build_server() -> Server:
    if not settings.ldap_server_uri:
        raise LdapConfigurationError("LDAP server URI is not configured")

    return Server(
        settings.ldap_server_uri,
        use_ssl=settings.ldap_use_ssl,
        tls=_build_tls(),
        connect_timeout=settings.ldap_timeout_seconds,
        get_info=ALL,
    )


def _open_connection(bind_dn: str | None, bind_password: str | None) -> Connection:
    server = _build_server()
    connection = Connection(
        server,
        user=bind_dn,
        password=bind_password,
        authentication=SIMPLE if bind_dn else ANONYMOUS,
        auto_bind=False,
        receive_timeout=settings.ldap_timeout_seconds,
    )

    connection.open()

    if settings.ldap_start_tls and not settings.ldap_use_ssl:
        connection.start_tls()

    if not connection.bind():
        raise LdapAuthenticationError("LDAP bind failed")

    return connection


def _build_user_dn(username: str) -> str:
    if settings.ldap_user_dn_template:
        return settings.ldap_user_dn_template.format(
            username=username,
            email=username,
        )

    if not settings.ldap_user_base_dn:
        raise LdapConfigurationError("LDAP user base DN is not configured")

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


def authenticate_ldap_user(username: str, password: str) -> LdapAuthenticatedUser:
    if not settings.ldap_enabled:
        raise LdapConfigurationError("LDAP authentication is disabled")

    if not password:
        raise LdapAuthenticationError("Empty password is not allowed")

    user_dn = _build_user_dn(username)

    try:
        with _open_connection(user_dn, password):
            return LdapAuthenticatedUser(user_dn=user_dn)
    except LDAPException as exc:
        raise LdapAuthenticationError("LDAP bind failed") from exc