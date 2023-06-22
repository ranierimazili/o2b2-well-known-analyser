# The open Open Banking Brasil project - well-known analyser
Analisador de well-known endpoints do Open Finance Brasil

Este projeto consulta todos os authorization servers anunciados no diretório de participantes do Open Finance Brasil e mostra a disponibilidade das tecnologias utilizadas pelos authorization servers dos participantes.

**PKCE** - Quantidade de servidores que permitem ou não a utilização

**Subject Types** - Quantidade de servidores que permitem public, pairwise ou não informaram

**Respose Modes** - Quantidade de servidores que permitem fragment, query, form_post ou não informaram

**Auth Methods** - Quantidade de servidores que permitem mTLS ou Private Key

**Offline** - Authorization servers declarados mas que não foi possível consultar o endpoint de well-known

## Como executar

```
node index.js
```
