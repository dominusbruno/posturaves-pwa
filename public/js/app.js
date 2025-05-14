document.addEventListener('DOMContentLoaded', () => {
  const listaLotesContainer = document.getElementById('lista-lotes-container')
  const modalAdicionarLoteElement = document.getElementById('modalAdicionarLote')
  const formAdicionarLote = document.getElementById('formAdicionarLote')
  const modalAdicionarLoteLabel = document.getElementById('modalAdicionarLoteLabel') // Pegar o título do modal

  let idLoteParaEditar = null // Variável para guardar o ID do lote em edição
  let modalInstance = null // Instância do Modal Bootstrap

  if (modalAdicionarLoteElement) {
    modalInstance = new bootstrap.Modal(modalAdicionarLoteElement)
  }

  // Função getStatusBadgeClass (existente)
  function getStatusBadgeClass(status) {
    /* ... seu código existente ... */
    switch (status.toLowerCase()) {
      case 'ativo':
        return 'bg-success'
      case 'planejado':
        return 'bg-warning text-dark'
      case 'encerrado':
        return 'bg-secondary'
      default:
        return 'bg-light text-dark'
    }
  }

  // Função carregarLotes (MODIFICADA para incluir botão Editar)
  async function carregarLotes() {
    // ... (início da função carregarLotes existente, incluindo tratamento de loading) ...
    if (!listaLotesContainer) {
      console.error('Elemento lista-lotes-container não encontrado!')
      return
    }
    let localLoadingElement = document.getElementById('loading-lotes')
    if (!localLoadingElement) {
      listaLotesContainer.innerHTML =
        '<div class="col"><p id="loading-lotes" class="text-center text-muted p-3">Carregando lotes...</p></div>'
      localLoadingElement = document.getElementById('loading-lotes')
    }
    if (localLoadingElement) localLoadingElement.style.display = 'block'

    try {
      const response = await fetch('/api/lotes')
      // ... (verificação de response.ok existente) ...
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`)
      }
      const lotes = await response.json()
      listaLotesContainer.innerHTML = ''

      if (lotes && lotes.length > 0) {
        lotes.forEach((lote) => {
          const dataFormatada = new Date(lote.dataEntrada).toLocaleDateString('pt-BR', {
            timeZone: 'UTC',
          })
          const loteCardHtml = `
                      <div class="col">
                          <div class="card h-100 shadow-sm">
                              <div class="card-body d-flex flex-column">
                                  <h5 class="card-title">${lote.nome}</h5>
                                  <h6 class="card-subtitle mb-2 text-muted">${
                                    lote.tipoAve || 'Tipo não informado'
                                  }</h6>
                                  <p class="card-text mt-2">
                                      <strong>Quantidade:</strong> ${
                                        lote.quantidadeAves || 0
                                      } aves<br>
                                      <strong>Data de Entrada:</strong> ${dataFormatada}<br>
                                      <strong>Status:</strong> <span class="badge ${getStatusBadgeClass(
                                        lote.status
                                      )}">${lote.status}</span>
                                  </p>
                                  <div class="mt-auto d-flex justify-content-end">
                                      <button class="btn btn-sm btn-outline-info me-2 btn-editar-lote" data-lote-id="${
                                        lote.id
                                      }">
                                          <i class="bi bi-pencil-square"></i> Editar
                                      </button>
                                      <button class="btn btn-sm btn-outline-danger ms-2 btn-excluir-lote" data-lote-id="${
                                        lote.id
                                      }" data-lote-nome="${lote.nome}">
                                          <i class="bi bi-trash"></i> Excluir
                                      </button>
                                  </div>
                              </div>
                              <div class="card-footer text-muted small">
                                  ID do Lote: ${lote.id}
                              </div>
                          </div>
                      </div>
                  `
          listaLotesContainer.insertAdjacentHTML('beforeend', loteCardHtml)
        })
      } else {
        // ... (tratamento de 'nenhum lote' existente) ...
        listaLotesContainer.innerHTML =
          '<div class="col"><p class="text-center text-muted">Nenhum lote de aves encontrado.</p></div>'
      }
    } catch (error) {
      // ... (tratamento de erro existente) ...
      console.error('Falha ao carregar os lotes:', error)
      if (listaLotesContainer) {
        listaLotesContainer.innerHTML = `<div class="col"><p class="text-center text-danger">Erro ao carregar os lotes.</p></div>`
      }
    } finally {
      // ... (código do finally existente - mantenha como está) ...
    }
  }

  carregarLotes() // (Existente)

  // Função para preparar e abrir o modal para edição
  async function abrirModalParaEditar(loteId) {
    if (!modalInstance || !formAdicionarLote || !modalAdicionarLoteLabel) return

    try {
      const response = await fetch(`/api/lotes/${loteId}`)
      if (!response.ok) {
        throw new Error('Não foi possível buscar os dados do lote para edição.')
      }
      const lote = await response.json()

      // Preencher o formulário
      document.getElementById('nomeLote').value = lote.nome
      document.getElementById('tipoAveLote').value = lote.tipoAve || ''
      document.getElementById('quantidadeAvesLote').value = lote.quantidadeAves || ''
      // Para input date, o formato deve ser YYYY-MM-DD
      document.getElementById('dataEntradaLote').value = lote.dataEntrada
        ? lote.dataEntrada.split('T')[0]
        : '' // Pega só a parte da data
      document.getElementById('statusLote').value = lote.status

      // Mudar título do modal e texto do botão
      modalAdicionarLoteLabel.textContent = 'Editar Lote de Aves'
      formAdicionarLote.querySelector('button[type="submit"]').textContent = 'Salvar Alterações'

      idLoteParaEditar = loteId // Define o ID do lote que está sendo editado
      modalInstance.show()
    } catch (error) {
      console.error('Erro ao preparar modal para edição:', error)
      alert(`Não foi possível carregar dados para edição: ${error.message}`)
    }
  }

  // Event listener para Adicionar/Editar Lote (MODIFICADO)
  if (formAdicionarLote && modalInstance) {
    formAdicionarLote.addEventListener('submit', async (event) => {
      event.preventDefault()
      const nome = document.getElementById('nomeLote').value.trim()
      const tipoAve = document.getElementById('tipoAveLote').value.trim()
      const quantidadeAves = document.getElementById('quantidadeAvesLote').value
      const dataEntrada = document.getElementById('dataEntradaLote').value
      const status = document.getElementById('statusLote').value

      if (!nome || !dataEntrada || !status) {
        alert('Por favor, preencha todos os campos obrigatórios (*).')
        return
      }
      const dadosLote = {
        nome,
        tipoAve,
        quantidadeAves: quantidadeAves ? parseInt(quantidadeAves, 10) : null,
        dataEntrada,
        status,
      }

      let url = '/api/lotes'
      let method = 'POST'

      if (idLoteParaEditar) {
        // Se idLoteParaEditar tem um valor, estamos editando
        url = `/api/lotes/${idLoteParaEditar}`
        method = 'PUT' // Usaremos PUT para atualizar
      }

      console.log(`Enviando para ${url} com método ${method}:`, dadosLote)

      try {
        const response = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dadosLote),
        })
        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          throw new Error(
            errorData?.message ||
              `Erro ao ${idLoteParaEditar ? 'atualizar' : 'salvar'} o lote: ${response.status}`
          )
        }
        await response.json() // Mesmo que não use o resultado, é bom consumir o corpo da resposta

        alert(`Lote ${idLoteParaEditar ? 'atualizado' : 'adicionado'} com sucesso!`)
        formAdicionarLote.reset()
        modalInstance.hide()
        idLoteParaEditar = null // Limpa o ID de edição
        // Resetar título e botão do modal para o padrão "Adicionar"
        if (modalAdicionarLoteLabel)
          modalAdicionarLoteLabel.textContent = 'Adicionar Novo Lote de Aves'
        formAdicionarLote.querySelector('button[type="submit"]').textContent = 'Salvar Lote'

        carregarLotes()
      } catch (error) {
        console.error(`Erro ao ${idLoteParaEditar ? 'atualizar' : 'adicionar'} lote:`, error)
        alert(`Falha ao ${idLoteParaEditar ? 'atualizar' : 'adicionar'} o lote: ${error.message}`)
      }
    })
  }

  // Event listener para Delegação (MODIFICADO para incluir Editar)
  if (listaLotesContainer) {
    listaLotesContainer.addEventListener('click', (event) => {
      const deleteButton = event.target.closest('.btn-excluir-lote')
      const editButton = event.target.closest('.btn-editar-lote') // NOVO

      if (deleteButton) {
        const loteId = deleteButton.dataset.loteId
        const loteNome = deleteButton.dataset.loteNome
        if (loteId) {
          excluirLote(loteId, loteNome) // Função excluirLote (existente)
        }
      } else if (editButton) {
        // NOVO
        const loteId = editButton.dataset.loteId
        if (loteId) {
          abrirModalParaEditar(loteId)
        }
      }
    })
  }

  // Função excluirLote (existente)
  async function excluirLote(loteId, loteNome) {
    /* ... seu código existente ... */
    if (!confirm(`Tem certeza que deseja excluir o lote "${loteNome}" (ID: ${loteId})?`)) return
    try {
      const response = await fetch(`/api/lotes/${loteId}`, { method: 'DELETE' })
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.message || `Erro ao excluir: ${response.status}`)
      }
      alert(`Lote "${loteNome}" excluído!`)
      carregarLotes()
    } catch (error) {
      console.error('Erro ao excluir:', error)
      alert(`Falha ao excluir: ${error.message}`)
    }
  }
})
