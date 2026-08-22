# Física Resolvida

Plataforma de estudo e gestão de questões de Física do ITA e do IME, com correção interativa, PDFs, roteiros de vídeo, gerador de atividades, login, perfis, papéis administrativos e área de faturamento preparada para evolução futura.

## Recursos principais

- login seguro com identidade ChatGPT, sem armazenamento de senha;
- onboarding com dados obrigatórios e perfil acadêmico/social opcional;
- papéis de usuário, professor, gerente e administrador;
- CRUD de usuários, inativação, suspensão, bloqueio e anonimização;
- auditoria com separação entre operadores humanos e o ator técnico Codex;
- perfil, endereço, avatar privado em R2 e informações de faturamento em D1;
- Termos de Uso e Aviso de Privacidade versionados;
- acervo ITA/IME, gerador de provas e roteiros de resolução.

O passo a passo funcional está em [GUIA_DE_USO.md](./GUIA_DE_USO.md).

## Desenvolvimento local

Requisitos: Node.js compatível com o projeto e `pnpm`.

```bash
pnpm install
pnpm db:generate
pnpm dev
```

Verificações:

```bash
pnpm lint
pnpm build
```

No ambiente publicado, configure `INITIAL_ADMIN_EMAIL` com o e-mail verificado do proprietário. O projeto usa as bindings `DB` para D1 e `FILES` para R2, declaradas em `.openai/hosting.json`.

## Segurança e monetização

O site deve permanecer privado durante a configuração inicial. O módulo financeiro atual é cadastral e não processa pagamentos nem armazena cartão/CVV. Antes da abertura pública ou cobrança, revise juridicamente os documentos, informe o canal oficial do controlador, configure um provedor de pagamentos e mova conteúdo premium e gabaritos para APIs/armazenamento protegidos no servidor.

