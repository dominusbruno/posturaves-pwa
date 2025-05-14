// Importar os módulos necessários
const express = require('express')
const path = require('path')
const sqlite3 = require('sqlite3').verbose() // .verbose() para mensagens de erro mais detalhadas

// Inicializar o aplicativo Express
const app = express()
// Middleware para parsear o corpo das requisições como JSON
app.use(express.json())
// Definir a porta em que o servidor vai escutar
const PORT = process.env.PORT || 3000

// Configuração do caminho do banco de dados
const DB_STORAGE_DIRECTORY = process.env.SQLITE_DB_DIR || __dirname // Para deploy e desenvolvimento local
const DBNAME = path.join(DB_STORAGE_DIRECTORY, 'posturaves.db')
console.log(`Caminho do arquivo do banco de dados: ${DBNAME}`)

// Conectar ao banco de dados SQLite
// A conexão é feita aqui, mas o servidor só inicia após a configuração do DB
const db = new sqlite3.Database(DBNAME, (err) => {
  if (err) {
    console.error(
      'ERRO FATAL: Não foi possível conectar/abrir o banco de dados SQLite.',
      err.message
    )
    process.exit(1) // Encerra a aplicação se não puder conectar ao DB
  } else {
    console.log(`Conectado ao banco de dados SQLite '${DBNAME}'.`)
    initializeDatabaseSchemaAndData() // Próximo passo: configurar schema e dados, depois iniciar o servidor
  }
})

// Função para inicializar o schema do banco e dados iniciais
function initializeDatabaseSchemaAndData() {
  // db.serialize garante que os comandos dentro dele rodem em sequência (um após o outro)
  db.serialize(() => {
    // 1. Criar a tabela 'lotes' com a nova estrutura se ela não existir
    db.run(
      `CREATE TABLE IF NOT EXISTS lotes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data_criacao TEXT NOT NULL,
                data_edicao TEXT NOT NULL,
                codigo_identificador TEXT NOT NULL UNIQUE,
                data_nascimento TEXT,
                linhagem TEXT,
                proprietario TEXT,
                quantidade_aves INTEGER,
                status TEXT NOT NULL CHECK(status IN ('ATIVO', 'INATIVO')),
                data_chegada TEXT NOT NULL
            )`,
      (err) => {
        if (err) {
          console.error("Erro ao criar a tabela 'lotes' com nova estrutura:", err.message)
          startExpressApp()
          return
        }
        console.log("Tabela 'lotes' (nova estrutura) verificada/criada com sucesso.")

        db.get('SELECT COUNT(*) as count FROM lotes', (err, row) => {
          if (err) {
            console.error('Erro ao contar lotes para dados iniciais (nova estrutura):', err.message)
            startExpressApp()
            return
          }

          if (row.count === 0) {
            console.log('Nenhum lote encontrado, inserindo dados iniciais (nova estrutura)...')
            const lotesIniciais = [
              {
                codigo_identificador: 'BR012025',
                data_nascimento: '2024-11-01',
                linhagem: 'Hy-Line W36',
                proprietario: 'Granja PosturAves',
                quantidade_aves: 500,
                status: 'ATIVO',
                data_chegada: '2025-03-15',
              },
              {
                codigo_identificador: 'AL022025',
                data_nascimento: '2025-01-10',
                linhagem: 'Lohmann Brown',
                proprietario: 'Granja PosturAves',
                quantidade_aves: 450,
                status: 'ATIVO',
                data_chegada: '2025-05-20',
              },
              {
                codigo_identificador: 'SP032025',
                data_nascimento: '2025-04-01',
                linhagem: 'Isa Brown',
                proprietario: 'Terceiros',
                quantidade_aves: 600,
                status: 'ATIVO',
                data_chegada: '2025-08-01',
              },
            ]

            const stmt = db.prepare(`INSERT INTO lotes 
                            (data_criacao, data_edicao, codigo_identificador, data_nascimento, linhagem, proprietario, quantidade_aves, status, data_chegada) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)

            const dataAtualISO = new Date().toISOString()
            let insercoesPendentes = lotesIniciais.length
            let algumaInsercaoFalhou = false

            lotesIniciais.forEach((lote) => {
              stmt.run(
                dataAtualISO,
                dataAtualISO,
                lote.codigo_identificador,
                lote.data_nascimento,
                lote.linhagem,
                lote.proprietario,
                lote.quantidade_aves,
                lote.status.toUpperCase(),
                lote.data_chegada,
                function (err) {
                  if (err) {
                    console.error(
                      `Erro ao inserir lote inicial '${lote.codigo_identificador}': `,
                      err.message
                    )
                    algumaInsercaoFalhou = true
                  }
                  insercoesPendentes--
                  if (insercoesPendentes === 0) {
                    stmt.finalize((errFinalize) => {
                      if (errFinalize) {
                        console.error(
                          'Erro ao finalizar batch de inserção de dados iniciais:',
                          errFinalize.message
                        )
                      } else if (!algumaInsercaoFalhou) {
                        console.log('Dados iniciais (nova estrutura) inseridos com sucesso.')
                      } else {
                        console.log(
                          'Tentativa de inserção de dados iniciais finalizada com um ou mais erros.'
                        )
                      }
                      console.log(
                        'CHAMANDO startExpressApp() APÓS INSERÇÃO/FINALIZE DOS DADOS INICIAIS'
                      )
                      startExpressApp()
                    })
                  }
                }
              )
            })
          } else {
            console.log(
              "Tabela 'lotes' (nova estrutura) já contém dados. Não é necessário inserir dados iniciais."
            )
            console.log('CHAMANDO startExpressApp() POIS TABELA JÁ TEM DADOS')
            startExpressApp()
          }
        })
      }
    )
  })
}

// Função para definir rotas e iniciar o servidor Express
function startExpressApp() {
  console.log('Configurando rotas da API e iniciando o servidor Express...')

  // API endpoint para listar lotes de aves (GET all)
  app.get('/api/lotes', (req, res) => {
    console.log('API: GET /api/lotes - INÍCIO')
    db.all('SELECT * FROM lotes ORDER BY data_criacao DESC', [], (err, rows) => {
      if (err) {
        console.error('API: GET /api/lotes - Erro ao buscar lotes:', err.message)
        return res.status(500).json({ error: err.message })
      }
      console.log('API: GET /api/lotes - DADOS ENCONTRADOS:', rows ? rows.length : 0, 'registros')
      res.json(rows)
    })
  })

  // API endpoint para buscar UM LOTE específico (GET by ID)
  app.get('/api/lotes/:id', (req, res) => {
    // <<<< Possível local de erro se houver typo aqui
    const loteId = req.params.id
    console.log(`API: GET /api/lotes/${loteId}`)
    const sql = 'SELECT * FROM lotes WHERE id = ?'
    db.get(sql, [loteId], (err, row) => {
      if (err) {
        console.error(`API: GET /api/lotes/${loteId} - Erro ao buscar lote:`, err.message)
        return res.status(500).json({ message: 'Erro ao buscar o lote.', error: err.message })
      }
      if (row) {
        res.json(row)
      } else {
        res.status(404).json({ message: 'Lote não encontrado.' })
      }
    })
  })

  // API endpoint para CRIAR um novo lote (POST)
  app.post('/api/lotes', (req, res) => {
    // <<<< Possível local de erro se houver typo aqui
    console.log('API: POST /api/lotes - Dados recebidos:', req.body)
    const {
      codigo_identificador,
      data_nascimento,
      linhagem,
      proprietario,
      quantidade_aves,
      status,
      data_chegada,
    } = req.body

    if (!codigo_identificador || !status || !data_chegada) {
      return res.status(400).json({
        message: 'Campos obrigatórios (codigo_identificador, status, data_chegada) não fornecidos.',
      })
    }
    if (!['ATIVO', 'INATIVO'].includes(status.toUpperCase())) {
      return res.status(400).json({ message: "Status inválido. Use 'ATIVO' ou 'INATIVO'." })
    }

    const dataAtualISO = new Date().toISOString()
    const sql = `INSERT INTO lotes (data_criacao, data_edicao, codigo_identificador, data_nascimento, linhagem, proprietario, quantidade_aves, status, data_chegada)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    const params = [
      dataAtualISO,
      dataAtualISO,
      codigo_identificador,
      data_nascimento,
      linhagem,
      proprietario,
      quantidade_aves,
      status.toUpperCase(),
      data_chegada,
    ]

    db.run(sql, params, function (err) {
      if (err) {
        console.error('API: POST /api/lotes - Erro ao inserir lote:', err.message)
        if (err.message.includes('UNIQUE constraint failed: lotes.codigo_identificador')) {
          return res
            .status(409)
            .json({ message: 'Já existe um lote cadastrado com este Código Identificador.' })
        }
        return res
          .status(500)
          .json({ message: 'Erro ao salvar o lote no banco de dados.', error: err.message })
      }
      console.log(
        `API: POST /api/lotes - Novo lote inserido com ID: ${this.lastID}, Código: ${codigo_identificador}`
      )
      res.status(201).json({
        message: 'Lote adicionado com sucesso!',
        loteId: this.lastID,
        codigo_identificador: codigo_identificador,
      })
    })
  })

  // API endpoint para ATUALIZAR um lote existente (PUT)
  app.put('/api/lotes/:id', (req, res) => {
    // <<<< Possível local de erro se houver typo aqui
    const loteId = req.params.id
    console.log(`API: PUT /api/lotes/${loteId} - Dados recebidos:`, req.body)
    const {
      codigo_identificador,
      data_nascimento,
      linhagem,
      proprietario,
      quantidade_aves,
      status,
      data_chegada,
    } = req.body

    if (!codigo_identificador || !status || !data_chegada) {
      return res.status(400).json({
        message:
          'Campos obrigatórios (codigo_identificador, status, data_chegada) não fornecidos para atualização.',
      })
    }
    if (status && !['ATIVO', 'INATIVO'].includes(status.toUpperCase())) {
      return res.status(400).json({ message: "Status inválido. Use 'ATIVO' ou 'INATIVO'." })
    }

    const dataEdicaoISO = new Date().toISOString()
    const sql = `UPDATE lotes SET codigo_identificador = ?, data_nascimento = ?, linhagem = ?, proprietario = ?,
                     quantidade_aves = ?, status = ?, data_chegada = ?, data_edicao = ? WHERE id = ?`
    const params = [
      codigo_identificador,
      data_nascimento,
      linhagem,
      proprietario,
      quantidade_aves,
      status.toUpperCase(),
      data_chegada,
      dataEdicaoISO,
      loteId,
    ]

    db.run(sql, params, function (err) {
      if (err) {
        console.error(`API: PUT /api/lotes/${loteId} - Erro ao atualizar lote:`, err.message)
        if (err.message.includes('UNIQUE constraint failed: lotes.codigo_identificador')) {
          return res
            .status(409)
            .json({ message: 'Já existe um outro lote cadastrado com este Código Identificador.' })
        }
        return res
          .status(500)
          .json({ message: 'Erro ao atualizar o lote no banco de dados.', error: err.message })
      }
      if (this.changes > 0) {
        console.log(`API: PUT /api/lotes/${loteId} - Lote atualizado com sucesso.`)
        res.status(200).json({ message: 'Lote atualizado com sucesso!', id: loteId })
      } else {
        res.status(404).json({ message: 'Lote não encontrado para atualização.' })
      }
    })
  })

  // API endpoint para EXCLUIR um lote (DELETE)
  app.delete('/api/lotes/:id', (req, res) => {
    // <<<< Possível local de erro se houver typo aqui
    const loteId = req.params.id
    console.log(`API: DELETE /api/lotes/${loteId}`)
    const sql = 'DELETE FROM lotes WHERE id = ?'
    db.run(sql, [loteId], function (err) {
      if (err) {
        console.error(`API: DELETE /api/lotes/${loteId} - Erro ao excluir lote:`, err.message)
        return res
          .status(500)
          .json({ message: 'Erro ao excluir o lote no banco de dados.', error: err.message })
      }
      if (this.changes > 0) {
        console.log(`API: DELETE /api/lotes/${loteId} - Lote excluído com sucesso.`)
        res.status(200).json({ message: `Lote com ID ${loteId} excluído com sucesso.` })
      } else {
        res.status(404).json({ message: 'Lote não encontrado.' })
      }
    })
  })

  app.use(express.static(path.join(__dirname, '../public')))

  app.get('/catchalltest', (req, res) => {
    // <<<< Possível local de erro se houver typo aqui (embora '*' seja geralmente seguro)
    res.sendFile(path.join(__dirname, '../public/index.html'))
  })

  app.listen(PORT, () => {
    console.log(`Servidor PosturAves (com nodemon!) INICIADO E OUVINDO na porta ${PORT}`)
    console.log(`Acesse o frontend em: http://localhost:${PORT}`)
    console.log(`API de lotes (BD ok) disponível em: http://localhost:${PORT}/api/lotes`)
  })
}
