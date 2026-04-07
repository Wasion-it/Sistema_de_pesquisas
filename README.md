# Sistema de Pesquisas

Estrutura inicial simples com backend em FastAPI e frontend em React.

## Estrutura

- `backend/`: API HTTP com organização por camadas simples.
- `frontend/`: aplicação React usando Vite.

```text
backend/
	app/
		api/
			v1/
				endpoints/
				router.py
		core/
		models/
		repositories/
		schemas/
		services/
		main.py
	tests/

frontend/
	src/
		components/
		pages/
		services/
		styles/
		App.jsx
		main.jsx
```

## Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

A API ficará disponível em `http://127.0.0.1:8000`.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

A interface ficará disponível em `http://127.0.0.1:5173`.

## Próximos passos

1. Adicionar rotas reais da aplicação em `backend/app/api/v1`.
2. Implementar serviços e integração com banco de dados no backend.
3. Evoluir o frontend a partir de `frontend/src/pages` e `frontend/src/services`.
