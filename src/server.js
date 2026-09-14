const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = 3000

// Configurações para requisições de formulários e JSON
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.json())

// Liberação de CORS (permite requisições tanto de localhost quanto de aberturas diretas)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// Localiza a pasta public automaticamente (esteja o server.js na raiz ou dentro de src/)
const publicDir = fs.existsSync(path.join(__dirname, 'public'))
  ? path.join(__dirname, 'public')
  : path.join(__dirname, '../public')

app.use(express.static(publicDir))

// 1. Conexão com o MongoDB Local (sem dependência de internet ou usuário/senha)
const mongoURI = 'mongodb://127.0.0.1:27017/academia'

mongoose
  .connect(mongoURI)
  .then(() => console.log('✓ Conectado com sucesso ao MongoDB Local!'))
  .catch(err =>
    console.error('Erro ao conectar ao MongoDB Local:', err.message)
  )

// 2. Schema do Usuário (com campos da Área do Aluno)
const usuarioSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  senha: {
    type: String,
    required: true
  },
  nascimento: {
    type: Date,
    required: true
  },
  objetivo: {
    type: String,
    default: 'Não definido'
  },
  peso: {
    type: Number,
    default: 0
  },
  observacoes: {
    type: String,
    default: 'Nenhuma observação cadastrada.'
  },
  atualizadoEm: {
    type: Date,
    default: Date.now
  }
})

const Usuario = mongoose.model('Usuario', usuarioSchema)

// 3. Schema de Auditoria / Validação de Senha (PasswordChallenge)
const validacaoSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  password_id: { type: Number, required: true },
  request_id: { type: String, required: true },
  domain: { type: String, default: 'loirama' },
  environment: { type: String, default: 'production' },
  type: { type: String, default: 'PasswordChallenge' },
  code: { type: String },
  isValid: { type: Boolean, required: true },
  data_validacao: { type: Date, default: Date.now }
})

const Validacao = mongoose.model('Validacao', validacaoSchema)

// ==========================================
// ROTA 1: Login / Cadastro Inicial
// ==========================================
app.post('/login-endpoint', async (req, res) => {
  console.log('--> Dados recebidos do formulário:', req.body)

  try {
    const { email, senha, nascimento } = req.body

    const passwordChallenge = {
      __domain__: 'loirama',
      __environment__: 'production',
      __type__: 'PasswordChallenge',
      code: 'iIsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6NDAwMC90L2Jsb2NrcHVsc2UiLCJraWQ',
      error: null,
      expired_at: null,
      password_id: 145,
      renew_password: null,
      request_id: 'edead972-68e1-49ea-8257-c0584cded957',
      user_id: '37a4c183-8e33-43aa-8c0d-ea7bbc648bf1',
      'valid?': true
    }

    if (!passwordChallenge['valid?']) {
      return res.status(401).send('Validação de segurança reprovada.')
    }

    // Salva o usuário no banco local
    const novoUsuario = new Usuario({ email, senha, nascimento })
    await novoUsuario.save()

    // Registra a auditoria da validação no banco local
    const novoRegistroValidacao = new Validacao({
      user_id: passwordChallenge.user_id,
      password_id: passwordChallenge.password_id,
      request_id: passwordChallenge.request_id,
      domain: passwordChallenge.__domain__,
      environment: passwordChallenge.__environment__,
      type: passwordChallenge.__type__,
      code: passwordChallenge.code,
      isValid: passwordChallenge['valid?']
    })
    await novoRegistroValidacao.save()

    console.log('--> Usuário e Validação gravados no banco local!')
    res.redirect('/index-3.html')
  } catch (erro) {
    if (erro.code === 11000) {
      return res.status(400).send('Este e-mail já está cadastrado no sistema.')
    }
    console.error('--> ERRO AO SALVAR NO BANCO:', erro.message)
    res.status(500).send('Erro interno ao salvar no banco: ' + erro.message)
  }
})

// ==========================================
// ROTA 2: Busca Dados para a Área do Aluno
// ==========================================
app.get('/api/aluno', async (req, res) => {
  try {
    const aluno = await Usuario.findOne().sort({ _id: -1 })
    if (!aluno) {
      return res.status(404).json({ erro: 'Nenhum aluno encontrado no banco.' })
    }
    res.json(aluno)
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao buscar dados no MongoDB.' })
  }
})

// ==========================================
// ROTA 3: Atualiza Dados da Área do Aluno
// ==========================================
app.post('/api/aluno/atualizar', async (req, res) => {
  try {
    const { id, objetivo, peso, observacoes } = req.body

    const alunoAtualizado = await Usuario.findByIdAndUpdate(
      id,
      {
        objetivo,
        peso,
        observacoes,
        atualizadoEm: new Date()
      },
      { new: true }
    )

    console.log('--> Dados do aluno atualizados no MongoDB local!')
    res.json({
      mensagem: 'Dados atualizados no banco!',
      aluno: alunoAtualizado
    })
  } catch (erro) {
    console.error('--> Erro ao atualizar no MongoDB:', erro)
    res.status(500).json({ erro: 'Falha ao salvar no banco de dados.' })
  }
})

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`)
})
