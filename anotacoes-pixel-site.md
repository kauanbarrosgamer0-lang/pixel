# Pixel Site - Anotacoes de Aprendizado

## Contexto do projeto

Estou criando um site do zero para aprender programacao na pratica.

Stack atual:

- HTML
- CSS
- JavaScript puro, tambem chamado de vanilla JavaScript
- Supabase para autenticacao
- Three.js para cena 3D
- GSAP para animacoes
- Tailwind via CDN
- Hospedagem planejada na Vercel
- Repositorio no GitHub

O projeto comecou como um arquivo unico chamado `index.html`, com HTML, CSS e JavaScript juntos.

## O que foi melhorado ate agora

O arquivo unico foi separado em arquivos menores:

- `index.html`: estrutura da pagina
- `styles.css`: estilos visuais
- `app.js`: logica principal, autenticacao, catalogo, filtros e modal
- `scene.js`: Three.js, loader, animacoes e cena 3D

Esse processo se chama **separacao de responsabilidades**.

## Separacao de responsabilidades

Separacao de responsabilidades significa dividir o projeto em partes, onde cada arquivo tem uma funcao clara.

Exemplo:

```text
index.html  -> estrutura
styles.css  -> aparencia
app.js      -> logica principal
scene.js    -> animacao 3D
```

Isso melhora a **manutenibilidade** do projeto.

Manutenibilidade significa a facilidade de entender, alterar e corrigir o codigo no futuro.

## Termos profissionais aprendidos

### HTML semantico

HTML semantico significa usar tags corretas para dar significado a estrutura da pagina.

Exemplos:

- `header`
- `main`
- `section`
- `footer`
- `button`
- `nav`

### CSS

CSS e a camada visual do site.

Termos importantes:

- layout
- responsividade
- variaveis CSS
- breakpoints
- hierarquia visual
- design system

### JavaScript

JavaScript cuida da logica da aplicacao.

Termos importantes:

- manipulacao do DOM
- event listeners
- estado da aplicacao
- renderizacao dinamica
- requisicoes HTTP
- fetch

### Vanilla JavaScript

Vanilla JavaScript significa JavaScript puro, sem React, Vue, Angular ou outro framework.

### Autenticacao

Autenticacao significa verificar quem e o usuario.

Exemplo:

```text
Login = autenticacao
```

### Autorizacao

Autorizacao significa verificar o que o usuario pode acessar.

Exemplo:

```text
Usuario logado pode ver o catalogo
Usuario nao logado precisa entrar primeiro
```

### RLS

RLS significa Row Level Security.

No Supabase, RLS serve para proteger os dados do banco.

Exemplo simples:

```text
Cada usuario so pode acessar os dados que tem permissao para ver.
```

### XSS

XSS e uma falha de seguranca onde alguem tenta colocar codigo malicioso dentro do site.

Exemplo de cuidado:

```text
Evitar colocar dados do usuario diretamente no HTML usando innerHTML.
```

Quando for exibir texto vindo do usuario, e mais seguro usar `textContent`.

### Token e sessao

Quando o usuario faz login, o Supabase devolve um token.

Esse token funciona como uma chave temporaria dizendo:

```text
Este usuario esta autenticado.
```

E importante validar se o token ainda esta ativo e cuidar bem da sessao.

## GitHub, servidor local e Vercel

Foi definido o seguinte fluxo:

```text
GitHub = historico do projeto
Servidor local = ambiente de teste
Vercel = publicacao do site
```

Nao precisa esperar o projeto ficar perfeito para colocar no GitHub.

O ideal e subir o projeto no GitHub agora e ir salvando a evolucao com commits.

## Termos de Git

### Repositorio

Repositorio e a pasta do projeto salva no GitHub.

### Commit

Commit e um salvamento de uma alteracao no historico do projeto.

Exemplo:

```text
Separar CSS e JavaScript do HTML
```

### Push

Push significa enviar os commits para o GitHub.

### Deploy

Deploy significa publicar o site para outras pessoas acessarem.

### Main

Main e a branch principal do projeto.

### Branch

Branch e uma linha separada de desenvolvimento.

## Fluxo recomendado

```text
1. Fazer uma melhoria pequena
2. Testar no servidor local
3. Criar um commit
4. Enviar para o GitHub com push
5. Repetir o processo
6. Quando estiver bom, fazer deploy na Vercel
```

## Exemplos de commits futuros

```text
Separar CSS e JavaScript do HTML
Corrigir textos e metadados SEO
Melhorar seguranca da sessao
Adicionar formulario de orcamento
Melhorar catalogo responsivo
Otimizar carregamento das animacoes
```

## Proximos passos sugeridos

1. Testar o site localmente com Live Server.
2. Subir os arquivos no GitHub.
3. Fazer o primeiro commit da versao organizada.
4. Corrigir possiveis problemas visuais depois da separacao.
5. Melhorar seguranca do nome do usuario usando `textContent`.
6. Revisar autenticacao e sessao do Supabase.
7. Criar formulario de orcamento.
8. Publicar na Vercel quando a versao estiver mais madura.

## Frase tecnica para descrever o projeto

```text
Landing page estatica com catalogo interativo, autenticacao via Supabase REST API, renderizacao dinamica no client-side, animacoes com GSAP e cena 3D com Three.js.
```

Em palavras simples:

```text
Site com pagina inicial, login, catalogo interativo, filtros, botoes de contato e animacao 3D.
```

