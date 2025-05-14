document.addEventListener('DOMContentLoaded', () => {
  // ... (código existente no início: listaLotesContainer, modalAdicionarLoteElement, formAdicionarLote, etc.)
  const listaLotesContainer = document.getElementById('lista-lotes-container')
  const modalAdicionarLoteElement = document.getElementById('modalAdicionarLote')
  const formAdicionarLote = document.getElementById('formAdicionarLote')
  const modalAdicionarLoteLabel = document.getElementById('modalAdicionarLoteLabel')

  let idLoteParaEditar = null
  let modalInstance = null

  if (modalAdicionarLoteElement) {
    modalInstance = new bootstrap.Modal(modalAdicionarLoteElement)
  }

  function getStatusBadgeClass(status) {
    /* ... seu código existente ... */
    switch (
      status ? status.toLowerCase() : '' // Adicionado verificação de status null/undefined
    ) {
      case 'ativo':
        return 'bg-success'
      case 'inativo':
        return 'bg-secondary' // Modificado para INATIVO
      default:
        return 'bg-light text-dark'
    }
  }

  async function carregarLotes() {
    // ...
    // let localLoadingElement = document.getElementById('loading-lotes'); // Esta linha está no seu código
    // if (!localLoadingElement && listaLotesContainer) { // Esta linha está no seu código
    //   listaLotesContainer.innerHTML = // Esta linha está no seu código
    //     '<div class="col"><p id="loading-lotes" class="text-center text-muted p-3">Carregando lotes...</p></div>'
    //   localLoadingElement = document.getElementById('loading-lotes'); // Esta linha está no seu código
    // }
    // if (localLoadingElement) localLoadingElement.style.display = 'block'; // Esta linha está no seu código

    try {
      const response = await fetch('/api/lotes')
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`) // Simplifiquei um pouco o erro aqui para teste
      }
      const lotes = await response.json()
      listaLotesContainer.innerHTML = '' // Limpa o container (remove "Carregando...")

      if (lotes && lotes.length > 0) {
        lotes.forEach((lote) => {
          // ... (criação do loteCardHtml) ...
          // É CRUCIAL QUE NENHUMA PROPRIEDADE ACESSADA EM 'lote' AQUI SEJA UNDEFINED
          // E CAUSE UM ERRO QUE IMPEÇA O insertAdjacentHTML DE FUNCIONAR
          // Por exemplo, se lote.data_criacao fosse null e new Date(null) causasse problema
          // Embora o schema NOT NULL devesse prevenir isso para data_criacao/edicao
          const dataNascimentoFormatada = lote.data_nascimento
            ? new Date(lote.data_nascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
            : 'Não informada'
          const dataChegadaFormatada = new Date(lote.data_chegada).toLocaleDateString('pt-BR', {
            timeZone: 'UTC',
          }) // data_chegada é NOT NULL
          const dataCriacaoFormatada = new Date(lote.data_criacao).toLocaleString('pt-BR', {
            timeZone: 'UTC',
          }) // data_criacao é NOT NULL
          const dataEdicaoFormatada = new Date(lote.data_edicao).toLocaleString('pt-BR', {
            timeZone: 'UTC',
          }) // data_edicao é NOT NULL

          const loteCardHtml = `
              <div class="col">
                  <div class="card h-100 shadow-sm">
                      <div class="card-header fw-bold">${lote.codigo_identificador}</div>
                      <div class="card-body d-flex flex-column">
                          <p class="card-text mb-1"><small class="text-muted">Linhagem:</small> ${
                            lote.linhagem || 'N/A'
                          }</p>
                          <p class="card-text mb-1"><small class="text-muted">Proprietário:</small> ${
                            lote.proprietario || 'N/A'
                          }</p>
                          <p class="card-text mb-1"><small class="text-muted">Qtd. Aves:</small> ${
                            lote.quantidade_aves === null || lote.quantidade_aves === undefined
                              ? 0
                              : lote.quantidade_aves
                          }</p> <p class="card-text mb-1"><small class="text-muted">Nascimento:</small> ${dataNascimentoFormatada}</p>
                          <p class="card-text mb-1"><small class="text-muted">Chegada:</small> ${dataChegadaFormatada}</p>
                          <p class="card-text mb-1"><small class="text-muted">Status:</small> <span class="badge ${getStatusBadgeClass(
                            lote.status
                          )}">${lote.status}</span></p>
                          <p class="card-text mt-2 mb-1"><small class="text-muted">Criado em:</small> ${dataCriacaoFormatada}</p>
                          <p class="card-text"><small class="text-muted">Editado em:</small> ${dataEdicaoFormatada}</p>
                          <div class="mt-auto d-flex justify-content-end pt-2">
                              <button class="btn btn-sm btn-outline-info me-2 btn-editar-lote" data-lote-id="${
                                lote.id
                              }">
                                  <i class="bi bi-pencil-square"></i> Editar
                              </button>
                              <button class="btn btn-sm btn-outline-danger btn-excluir-lote" data-lote-id="${
                                lote.id
                              }" data-lote-nome="${lote.codigo_identificador}">
                                  <i class="bi bi-trash"></i> Excluir
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          `
          listaLotesContainer.insertAdjacentHTML('beforeend', loteCardHtml)
        })
      } else {
        listaLotesContainer.innerHTML =
          '<div class="col"><p class="text-center text-muted">Nenhum lote encontrado.</p></div>'
      }
    } catch (error) {
      // Este catch é do user
      /* ... tratamento de erro existente ... */
      // O código fornecido pelo usuário está incompleto aqui
      // No código completo do usuário, o catch é:
      // console.error('Falha ao carregar os lotes:', error);
      // if (listaLotesContainer) {
      //     listaLotesContainer.innerHTML = `<div class="col"><p class="text-center text-danger">Erro ao carregar os lotes. Tente novamente mais tarde.</p><p class="text-center text-muted small">${error.message}</p></div>`;
      // }
      // ESTE BLOCO CATCH DEVE SER EXECUTADO SE HOUVER UM ERRO NO TRY. Se a página fica em branco, talvez o erro seja antes ou o catch não está funcionando.
    }
  }

  // Função para preparar e abrir o modal para edição - MODIFICADA
  async function abrirModalParaEditar(loteId) {
    if (!modalInstance || !formAdicionarLote || !modalAdicionarLoteLabel) return
    try {
      const response = await fetch(`/api/lotes/${loteId}`)
      if (!response.ok) {
        throw new Error('Não foi possível buscar os dados do lote para edição.')
      }
      const lote = await response.json()

      // Preencher o formulário com os novos campos
      document.getElementById('codigoIdentificadorLote').value = lote.codigo_identificador
      document.getElementById('dataNascimentoLote').value = lote.data_nascimento || '' // Trata se for null
      document.getElementById('linhagemLote').value = lote.linhagem || ''
      document.getElementById('proprietarioLote').value = lote.proprietario || ''
      document.getElementById('quantidadeAvesLote').value = lote.quantidade_aves || ''
      document.getElementById('dataChegadaLote').value = lote.data_chegada
      document.getElementById('statusLote').value = lote.status

      modalAdicionarLoteLabel.textContent = 'Editar Lote de Aves'
      formAdicionarLote.querySelector('button[type="submit"]').textContent = 'Salvar Alterações'
      idLoteParaEditar = loteId
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
      // Coletar dados dos novos campos
      const dadosLote = {
        codigo_identificador: document.getElementById('codigoIdentificadorLote').value.trim(),
        data_nascimento: document.getElementById('dataNascimentoLote').value,
        linhagem: document.getElementById('linhagemLote').value.trim(),
        proprietario: document.getElementById('proprietarioLote').value.trim(),
        quantidade_aves: document.getElementById('quantidadeAvesLote').value
          ? parseInt(document.getElementById('quantidadeAvesLote').value, 10)
          : null,
        data_chegada: document.getElementById('dataChegadaLote').value,
        status: document.getElementById('statusLote').value.toUpperCase(),
      }

      // Validação básica (ajustar conforme necessidade)
      if (!dadosLote.codigo_identificador || !dadosLote.data_chegada || !dadosLote.status) {
        alert('Por favor, preencha todos os campos obrigatórios (*).')
        return
      }

      let url = '/api/lotes'
      let method = 'POST'
      if (idLoteParaEditar) {
        url = `/api/lotes/${idLoteParaEditar}`
        method = 'PUT'
      }

      console.log(`Enviando para ${url} com método ${method}:`, dadosLote)
      try {
        const response = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dadosLote),
        })
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: `Erro ${response.status}` }))
          throw new Error(
            errorData.message || `Erro ao ${idLoteParaEditar ? 'atualizar' : 'salvar'} o lote.`
          )
        }
        await response.json()
        alert(`Lote ${idLoteParaEditar ? 'atualizado' : 'adicionado'} com sucesso!`)
        formAdicionarLote.reset()
        modalInstance.hide()
        idLoteParaEditar = null
        if (modalAdicionarLoteLabel)
          modalAdicionarLoteLabel.textContent = 'Adicionar Novo Lote de Aves'
        formAdicionarLote.querySelector('button[type="submit"]').textContent = 'Salvar Lote'
        carregarLotes()
      } catch (error) {
        console.error(`Erro ao ${idLoteParaEditar ? 'atualizar' : 'adicionar'} lote:`, error)
        alert(`Falha: ${error.message}`)
      }
    })
  }

  // Event listener para Delegação (Editar/Excluir - existente)
  if (listaLotesContainer) {
    // ... (código do event listener para 'click' existente, chamando abrirModalParaEditar e excluirLote - mantenha como está)
    listaLotesContainer.addEventListener('click', (event) => {
      const deleteButton = event.target.closest('.btn-excluir-lote')
      const editButton = event.target.closest('.btn-editar-lote')

      if (deleteButton) {
        const loteId = deleteButton.dataset.loteId
        const loteNome = deleteButton.dataset.loteNome // Agora será o codigo_identificador
        if (loteId) {
          excluirLote(loteId, loteNome)
        }
      } else if (editButton) {
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
