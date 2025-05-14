// Importar o módulo Express
const express = require('express')
// Importar o módulo 'path' do Node.js para lidar com caminhos de arquivos
const path = require('path')
// Importar o módulo sqlite3
const sqlite3 = require('sqlite3').verbose()

// Criar uma instância do aplicativo Express
const app = express()

// --- INÍCIO DA MODIFICAÇÃO: Adicionar middleware para parsear JSON ---
// Middleware para parsear o corpo das requisições como JSON
app.use(express.json())
// --- FIM DA MODIFICAÇÃO ---

// Definir a porta em que o servidor vai escutar
const PORT = process.env.PORT || 3000

// Configuração do Banco de Dados SQLite (código existente)
const DBNAME = 'posturaves.db'
const db = new sqlite3.Database(path.join(__dirname, DBNAME), (err) => {
  // ... (código de conexão e criação da tabela existente - mantenha como está) ...
  if (err) {
    console.error('Erro ao abrir/criar o banco de dados', err.message)
  } else {
    console.log(`Conectado ao banco de dados SQLite '${DBNAME}'.`)
    db.run(
      `CREATE TABLE IF NOT EXISTS lotes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL UNIQUE,
            tipoAve TEXT,
            quantidadeAves INTEGER,
            dataEntrada TEXT,
            status TEXT
        )`,
      (err) => {
        if (err) {
          console.error("Erro ao criar a tabela 'lotes'", err.message)
        } else {
          console.log("Tabela 'lotes' verificada/criada com sucesso.")
          db.get('SELECT COUNT(*) as count FROM lotes', (err, row) => {
            if (err) {
              // ... (tratamento de erro existente) ...
              return
            }
            if (row.count === 0) {
              // ... (código de inserção de dados iniciais existente - mantenha como está) ...
            } else {
              console.log(
                "Tabela 'lotes' já contém dados, não é necessário inserir dados iniciais."
              )
            }
          })
        }
      }
    )
  }
})

// API endpoint para listar lotes de aves (GET - código existente)
app.get('/api/lotes', (req, res) => {
  // ... (código existente para GET /api/lotes - mantenha como está) ...
  console.log('Requisição recebida em /api/lotes (lendo do BD)')
  db.all('SELECT * FROM lotes ORDER BY dataEntrada DESC', [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar lotes do banco de dados', err.message)
      res.status(500).json({ error: err.message })
      return
    }
    res.json(rows)
  })
})

// --- INÍCIO DO NOVO CÓDIGO: API endpoint para buscar UM LOTE específico (GET by ID) ---
app.get('/api/lotes/:id', (req, res) => {
  const loteId = req.params.id
  console.log(`Requisição GET recebida para /api/lotes/${loteId}`)

  const sql = 'SELECT * FROM lotes WHERE id = ?'
  const params = [loteId]

  // db.get() é usado para buscar uma única linha
  db.get(sql, params, (err, row) => {
    if (err) {
      console.error('Erro ao buscar lote do banco de dados:', err.message)
      return res.status(500).json({ message: 'Erro ao buscar o lote.', error: err.message })
    }

    if (row) {
      res.json(row) // Retorna o lote encontrado
    } else {
      res.status(404).json({ message: 'Lote não encontrado.' }) // Nenhum lote com esse ID
    }
  })
})

// --- INÍCIO DO NOVO CÓDIGO: API endpoint para CRIAR um novo lote (POST) ---
app.post('/api/lotes', (req, res) => {
  console.log('Requisição POST recebida em /api/lotes com dados:', req.body)

  // Coleta os dados do corpo da requisição
  const { nome, tipoAve, quantidadeAves, dataEntrada, status } = req.body

  // Validação básica dos dados recebidos
  if (!nome || !dataEntrada || !status) {
    return res
      .status(400)
      .json({ message: 'Campos obrigatórios (nome, dataEntrada, status) não fornecidos.' })
  }
  // Poderia adicionar mais validações aqui (ex: formato da data, tipo de dados, etc.)

  const sql = `INSERT INTO lotes (nome, tipoAve, quantidadeAves, dataEntrada, status)
                 VALUES (?, ?, ?, ?, ?)`
  const params = [nome, tipoAve, quantidadeAves, dataEntrada, status]

  // Usamos uma função regular aqui para poder acessar `this.lastID`
  db.run(sql, params, function (err) {
    if (err) {
      console.error('Erro ao inserir lote no banco de dados:', err.message)
      // Verifica se o erro é de violação da restrição UNIQUE (nome do lote duplicado)
      if (err.message.includes('UNIQUE constraint failed: lotes.nome')) {
        return res.status(409).json({ message: 'Já existe um lote cadastrado com este nome.' }) // 409 Conflict
      }
      // Para outros erros de banco
      return res
        .status(500)
        .json({ message: 'Erro ao salvar o lote no banco de dados.', error: err.message })
    }
    // Se chegou aqui, a inserção foi bem-sucedida
    console.log(`Novo lote inserido com ID: ${this.lastID}, Nome: ${nome}`)
    // Retorna uma resposta de sucesso (201 Created) com o ID do novo lote e os dados inseridos
    res.status(201).json({
      message: 'Lote adicionado com sucesso!',
      loteId: this.lastID,
      nome: nome,
      tipoAve: tipoAve,
      quantidadeAves: quantidadeAves,
      dataEntrada: dataEntrada,
      status: status,
    })
  })
})

// --- INÍCIO DO NOVO CÓDIGO: API endpoint para EXCLUIR um lote (DELETE) ---
app.delete('/api/lotes/:id', (req, res) => {
  const loteId = req.params.id // Pega o ID da URL (ex: /api/lotes/5)
  console.log(`Requisição DELETE recebida para /api/lotes/${loteId}`)

  const sql = 'DELETE FROM lotes WHERE id = ?'
  const params = [loteId]

  db.run(sql, params, function (err) {
    // Usamos function regular para ter acesso a `this`
    if (err) {
      console.error('Erro ao excluir lote do banco de dados:', err.message)
      return res
        .status(500)
        .json({ message: 'Erro ao excluir o lote do banco de dados.', error: err.message })
    }

    // `this.changes` informa quantas linhas foram afetadas pela última query.
    if (this.changes > 0) {
      console.log(`Lote com ID ${loteId} excluído com sucesso.`)
      res.status(200).json({ message: `Lote com ID ${loteId} excluído com sucesso.` })
      // Alternativamente, poderia enviar um status 204 No Content, sem corpo na resposta:
      // res.status(204).send();
    } else {
      // Nenhuma linha foi alterada, significa que o lote com o ID fornecido não foi encontrado
      console.log(`Nenhum lote encontrado com ID ${loteId} para excluir.`)
      res.status(404).json({ message: 'Lote não encontrado.' })
    }
  })
})

// --- INÍCIO DO NOVO CÓDIGO: API endpoint para ATUALIZAR um lote existente (PUT) ---
app.put('/api/lotes/:id', (req, res) => {
  const loteId = req.params.id
  console.log(`Requisição PUT recebida para /api/lotes/${loteId} com dados:`, req.body)

  // Coleta os dados do corpo da requisição
  const { nome, tipoAve, quantidadeAves, dataEntrada, status } = req.body

  // Validação básica dos dados recebidos
  if (!nome || !dataEntrada || !status) {
    return res
      .status(400)
      .json({
        message: 'Campos obrigatórios (nome, dataEntrada, status) não fornecidos para atualização.',
      })
  }
  // Poderia adicionar mais validações aqui (ex: formato da data, tipo de dados, etc.)

  const sql = `UPDATE lotes 
               SET nome = ?, 
                   tipoAve = ?, 
                   quantidadeAves = ?, 
                   dataEntrada = ?, 
                   status = ? 
               WHERE id = ?`
  const params = [nome, tipoAve, quantidadeAves, dataEntrada, status, loteId]

  // Usamos uma função regular aqui para poder acessar `this.changes`
  db.run(sql, params, function (err) {
    if (err) {
      console.error('Erro ao atualizar lote no banco de dados:', err.message)
      // Verifica se o erro é de violação da restrição UNIQUE (nome do lote duplicado)
      // Isso acontece se você tentar mudar o nome para um que JÁ EXISTE em OUTRO lote.
      if (err.message.includes('UNIQUE constraint failed: lotes.nome')) {
        return res
          .status(409)
          .json({ message: 'Já existe um outro lote cadastrado com este nome.' }) // 409 Conflict
      }
      // Para outros erros de banco
      return res
        .status(500)
        .json({ message: 'Erro ao atualizar o lote no banco de dados.', error: err.message })
    }

    // `this.changes` informa quantas linhas foram afetadas pela última query.
    if (this.changes > 0) {
      console.log(`Lote com ID ${loteId} atualizado com sucesso.`)
      // Retorna uma resposta de sucesso com os dados atualizados (ou apenas uma mensagem)
      res.status(200).json({
        message: 'Lote atualizado com sucesso!',
        id: loteId,
        nome: nome,
        tipoAve: tipoAve,
        quantidadeAves: quantidadeAves,
        dataEntrada: dataEntrada,
        status: status,
      })
    } else {
      // Nenhuma linha foi alterada, significa que o lote com o ID fornecido não foi encontrado
      console.log(`Nenhum lote encontrado com ID ${loteId} para atualizar.`)
      res.status(404).json({ message: 'Lote não encontrado para atualização.' })
    }
  })
})

// Middleware para servir arquivos estáticos da pasta 'public' (código existente)
app.use(express.static(path.join(__dirname, '../public')))

// Iniciar o servidor (código existente)
app.listen(PORT, () => {
  // ... (console.log existente - mantenha como está) ...
  console.log(`Servidor PosturAves (com nodemon!) rodando na porta ${PORT} e atualizando!`)
  console.log(`Acesse o frontend em: http://localhost:${PORT}`)
  console.log(`API de lotes (do BD) disponível em: http://localhost:${PORT}/api/lotes`)
})
