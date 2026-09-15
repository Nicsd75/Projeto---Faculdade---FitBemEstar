const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = 3000

// Configurações para ler formulários comuns e requisições JSON
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.json())

// Configuração de CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// Localiza a pasta public automaticamente
const publicDir = fs.existsSync(path.join(__dirname, 'public'))
  ? path.join(__dirname, 'public')
  : path.join(__dirname, '../public')

app.use(express.static(publicDir))

// 1. Conexão com o MongoDB Local
const mongoURI = 'mongodb://127.0.0.1:27017/academia'

mongoose
  .connect(mongoURI)
  .then(() => console.log('✓ Conectado com sucesso ao MongoDB Local!'))
  .catch(err =>
    console.error('Erro ao conectar ao MongoDB Local:', err.message)
  )

// 2. Schema do Aluno
const usuarioSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'O nome é obrigatório'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'O e-mail é obrigatório'],
    unique: true,
    trim: true,
    lowercase: true
  },
  senha: {
    type: String,
    required: [true, 'A senha é obrigatória'],
    trim: true
  },
  nascimento: {
    type: Date,
    required: [true, 'A data de nascimento é obrigatória']
  },
  objetivo: {
    type: String,
    default: 'Condicionamento Físico'
  },
  peso: {
    type: Number,
    default: 0
  },
  observacoes: {
    type: String,
    default: 'Nenhuma observação cadastrada.'
  },
  dataCadastro: {
    type: Date,
    default: Date.now
  }
})

const Usuario = mongoose.model('Usuario', usuarioSchema)

// ========================================================
// ROTA 1: CADASTRO DE NOVO ALUNO (POST /api/cadastro)
// ========================================================
app.post('/api/cadastro', async (req, res) => {
  console.log('\n--- [NOVO CADASTRO RECEBIDO] ---')
  console.log('Dados recebidos:', req.body)

  try {
    const { nome, email, senha, nascimento, objetivo, peso, observacoes } =
      req.body

    if (!nome || !email || !senha || !nascimento) {
      return res.status(400).json({
        sucesso: false,
        mensagem:
          'Preencha todos os campos obrigatórios (nome, e-mail, senha e nascimento).'
      })
    }

    const emailLimpo = String(email).toLowerCase().trim()
    const senhaLimpa = String(senha).trim()

    const novoUsuario = new Usuario({
      nome: String(nome).trim(),
      email: emailLimpo,
      senha: senhaLimpa,
      nascimento,
      objetivo: objetivo || 'Condicionamento Físico',
      peso: peso ? Number(peso) : 0,
      observacoes: observacoes || 'Matrícula recente.'
    })

    await novoUsuario.save()
    console.log(
      `✓ Conta criada com sucesso para: ${novoUsuario.nome} (${novoUsuario.email})`
    )

    return res.status(201).json({
      sucesso: true,
      mensagem: 'Cadastro realizado com sucesso!',
      alunoId: novoUsuario._id,
      redirectUrl: '/login.html'
    })
  } catch (erro) {
    if (erro.code === 11000) {
      return res.status(409).json({
        sucesso: false,
        mensagem: 'Este e-mail já está cadastrado no sistema.'
      })
    }

    console.error('Erro ao salvar no banco:', erro.message)
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor ao realizar cadastro.'
    })
  }
})

// ========================================================
// ROTA 2: VALIDAÇÃO DE LOGIN (POST /login-endpoint)
// Suporta tanto requisição via Formulário HTML quanto via Fetch (JSON)
// ========================================================
app.post('/login-endpoint', async (req, res) => {
  console.log('\n--- [TENTATIVA DE LOGIN] ---')
  console.log('Dados recebidos na requisição:', req.body)

  const isFetchRequest =
    req.is('json') || req.headers['content-type']?.includes('application/json')

  try {
    const { email, senha } = req.body

    if (!email || !senha) {
      const msg = 'Informe o e-mail e a senha.'
      if (isFetchRequest)
        return res.status(400).json({ sucesso: false, mensagem: msg })
      return res
        .status(400)
        .send(
          `<script>alert('${msg}'); window.location.href = '/login.html';</script>`
        )
    }

    const emailBusca = String(email).toLowerCase().trim()
    const senhaDigitada = String(senha).trim()

    // 1. Busca o aluno no MongoDB
    const usuario = await Usuario.findOne({ email: emailBusca })

    // 2. Se não existir no banco
    if (!usuario) {
      console.log(`❌ E-mail não encontrado no sistema: "${emailBusca}"`)
      const msg = `O e-mail "${emailBusca}" não possui cadastro.\\nFaça a matrícula primeiro na tela de cadastro.`
      if (isFetchRequest)
        return res.status(401).json({ sucesso: false, mensagem: msg })
      return res
        .status(401)
        .send(
          `<script>alert('${msg}'); window.location.href = '/cadastro.html';</script>`
        )
    }

    // 3. Validação da senha
    const senhaCadastrada = String(usuario.senha).trim()
    console.log(
      `Validação: Digitada="${senhaDigitada}" | Salva="${senhaCadastrada}"`
    )

    if (senhaDigitada !== senhaCadastrada) {
      console.log(`❌ Senha incorreta para o e-mail: ${usuario.email}`)
      const msg = 'Senha incorreta! Verifique os dados digitados.'
      if (isFetchRequest)
        return res.status(401).json({ sucesso: false, mensagem: msg })
      return res
        .status(401)
        .send(
          `<script>alert('${msg}'); window.location.href = '/login.html';</script>`
        )
    }

    // 4. Sucesso: Login aprovado
    console.log(
      `✓ Acesso autorizado para: ${usuario.nome} (ID: ${usuario._id})`
    )

    if (isFetchRequest) {
      return res.json({
        sucesso: true,
        mensagem: 'Login realizado com sucesso!',
        redirectUrl: `/home.html?id=${usuario._id}`
      })
    }

    // Redirecionamento padrão de formulário
    res.redirect(`/home.html?id=${usuario._id}`)
  } catch (erro) {
    console.error('Erro ao processar login:', erro)
    if (isFetchRequest)
      return res
        .status(500)
        .json({ sucesso: false, mensagem: 'Erro interno no servidor.' })
    res.status(500).send('Erro interno ao tentar autenticar.')
  }
})

// ========================================================
// ROTA 3: BUSCAR DADOS DO ALUNO AUTENTICADO (GET /api/aluno)
// ========================================================
app.get('/api/aluno', async (req, res) => {
  try {
    const { id } = req.query
    let aluno = null

    if (id && mongoose.isValidObjectId(id)) {
      aluno = await Usuario.findById(id)
    } else {
      aluno = await Usuario.findOne().sort({ _id: -1 })
    }

    if (!aluno) {
      return res.status(404).json({ erro: 'Nenhum aluno cadastrado.' })
    }

    res.json(aluno)
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao consultar banco de dados.' })
  }
})

// ========================================================
// ROTA 4: ATUALIZAR DADOS DO ALUNO (POST /api/aluno/atualizar)
// ========================================================
app.post('/api/aluno/atualizar', async (req, res) => {
  try {
    const { id, objetivo, peso, observacoes } = req.body
    const alunoAtualizado = await Usuario.findByIdAndUpdate(
      id,
      { objetivo, peso, observacoes },
      { new: true }
    )
    res.json({ sucesso: true, aluno: alunoAtualizado })
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao atualizar dados.' })
  }
})

// Inicialização
app.listen(PORT, () => {
  console.log(`=========================================`)
  console.log(`Servidor rodando em: http://localhost:${PORT}`)
  console.log(`Cadastro:            http://localhost:${PORT}/cadastro.html`)
  console.log(`Login:               http://localhost:${PORT}/login.html`)
  console.log(`Home / Painel:       http://localhost:${PORT}/home.html`)
  console.log(`=========================================`)
})
