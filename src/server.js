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
  .then(() => {
    console.log('✓ Conectado com sucesso ao MongoDB Local!')
    semearExerciciosIniciais()
  })
  .catch(err =>
    console.error('Erro ao conectar ao MongoDB Local:', err.message)
  )

// 2. Schema do Aluno / Usuário
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
    maxlength: [6, 'A senha deve ter no máximo 6 caracteres'],
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

// 3. Schema de Exercícios e Vídeos Tutoriais
const exercicioSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  grupoMuscular: { type: String, required: true },
  subgrupo: { type: String },
  nivelDificuldade: { type: String, default: 'Iniciante' },
  videoId: { type: String, required: true }, // ID do YouTube (ex: dQw4w9WgXcQ)
  descricao: { type: String },
  pontosAtencao: [String],
  errosComuns: [String]
})

const Exercicio = mongoose.model('Exercicio', exercicioSchema)

// Função para popular o catálogo de exercícios caso esteja vazio
async function semearExerciciosIniciais() {
  try {
    const total = await Exercicio.countDocuments()
    if (total === 0) {
      console.log('Populando catálogo de exercícios iniciais com vídeos...')
      await Exercicio.insertMany([
        {
          nome: 'Supino Reto com Barra',
          grupoMuscular: 'Peito',
          subgrupo: 'Peitoral Maior',
          nivelDificuldade: 'Iniciante',
          videoId: 'rT7DgCr-3pg',
          descricao:
            'Exercício multiarticular fundamental para ganho de força e volume no peitoral.',
          pontosAtencao: [
            'Mantenha as escápulas aduzidas e coladas no banco',
            'Pés firmes no chão o tempo todo',
            'Desça a barra controladamente na linha dos mamilos'
          ],
          errosComuns: [
            'Bater a barra no peito com impacto',
            'Abrir excessivamente os cotovelos a 90 graus',
            'Tirar o quadril do banco durante a subida'
          ]
        },
        {
          nome: 'Agachamento Livre',
          grupoMuscular: 'Pernas',
          subgrupo: 'Quadríceps e Glúteos',
          nivelDificuldade: 'Intermediário',
          videoId: 'bEv6CCg2BC8',
          descricao:
            'O principal movimento para força funcional e desenvolvimento completo de membros inferiores.',
          pontosAtencao: [
            'Base com pés na largura dos ombros ou ligeiramente mais aberta',
            'Abdômen contraído (manobra de Valsalva)',
            'Joelhos apontando na mesma direção das pontas dos pés'
          ],
          errosComuns: [
            'Projetar os joelhos para dentro no esforço (valgo dinâmico)',
            'Curvar a lombar no ponto mais baixo',
            'Tirar os calcanhares do solo'
          ]
        },
        {
          nome: 'Puxada Frontal no Pulley',
          grupoMuscular: 'Costas',
          subgrupo: 'Latíssimo do Dorso',
          nivelDificuldade: 'Iniciante',
          videoId: 'CAwf7n6Luuc',
          descricao:
            'Excelente para largura das costas e controle escapular antes de evoluir para a barra fixa.',
          pontosAtencao: [
            'Inicie o movimento puxando os ombros para baixo',
            'Puxe a barra em direção à parte superior do esterno',
            'Mantenha o peito aberto e estufado'
          ],
          errosComuns: [
            'Inclinar excessivamente o tronco para trás usando impulso',
            'Puxar a barra por trás da nuca',
            'Encolher os ombros na subida'
          ]
        },
        {
          nome: 'Rosca Direta com Barra W',
          grupoMuscular: 'Braços',
          subgrupo: 'Bíceps Braquial',
          nivelDificuldade: 'Iniciante',
          videoId: 'kwG2ipFRgfo',
          descricao:
            'Movimento isolador de bíceps com menor estresse articular nos punhos graças à barra W.',
          pontosAtencao: [
            'Cotovelos fixos ao lado do tronco',
            'Movimento cadenciado na descida (fase excêntrica)',
            'Pegada firme sem dobrar os punhos'
          ],
          errosComuns: [
            'Balançar o tronco para impulsionar a subida',
            'Jogar os cotovelos para frente no topo do movimento'
          ]
        }
      ])
      console.log('✓ Catálogo de exercícios e vídeos criado com sucesso!')
    }
  } catch (err) {
    console.error('Erro ao semear exercícios:', err.message)
  }
}

// ========================================================
// ROTAS DE CADASTRO E LOGIN
// ========================================================
app.post('/api/cadastro', async (req, res) => {
  try {
    const { nome, email, senha, nascimento, objetivo, peso, observacoes } =
      req.body

    if (!nome || !email || !senha || !nascimento) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Preencha todos os campos obrigatórios.'
      })
    }

    const emailLimpo = String(email).toLowerCase().trim()
    const senhaLimpa = String(senha).trim()

    if (senhaLimpa.length > 6) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'A senha deve ter no máximo 6 caracteres.'
      })
    }

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
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno ao realizar cadastro.'
    })
  }
})

const processarLogin = async (req, res) => {
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
    const usuario = await Usuario.findOne({ email: emailBusca })

    if (!usuario) {
      const msg = `O e-mail "${emailBusca}" não possui cadastro.\\nFaça a matrícula primeiro.`
      if (isFetchRequest)
        return res.status(401).json({ sucesso: false, mensagem: msg })
      return res
        .status(401)
        .send(
          `<script>alert('${msg}'); window.location.href = '/cadastro.html';</script>`
        )
    }

    if (usuario.senha !== senhaDigitada) {
      const msg = 'Senha incorreta! Verifique os dados digitados.'
      if (isFetchRequest)
        return res.status(401).json({ sucesso: false, mensagem: msg })
      return res
        .status(401)
        .send(
          `<script>alert('${msg}'); window.location.href = '/login.html';</script>`
        )
    }

    if (isFetchRequest) {
      return res.json({
        sucesso: true,
        redirectUrl: `/home.html?id=${usuario._id}`
      })
    }
    res.redirect(`/home.html?id=${usuario._id}`)
  } catch (erro) {
    if (isFetchRequest)
      return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' })
    res.status(500).send('Erro interno ao tentar autenticar.')
  }
}

app.post('/api/login', processarLogin)
app.post('/login-endpoint', processarLogin)

// ========================================================
// ROTAS DE ALUNO
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

    if (!aluno)
      return res.status(404).json({ erro: 'Nenhum aluno encontrado.' })
    res.json(aluno)
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao consultar banco de dados.' })
  }
})

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

// ========================================================
// ROTAS DE EXERCÍCIOS E VÍDEOS (NOVO)
// ========================================================
app.get('/api/exercicios', async (req, res) => {
  try {
    const { grupo } = req.query
    const filtro = grupo && grupo !== 'Todos' ? { grupoMuscular: grupo } : {}
    const exercicios = await Exercicio.find(filtro).sort({ nome: 1 })
    res.json(exercicios)
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao buscar lista de exercícios.' })
  }
})

app.get('/api/exercicios/:id', async (req, res) => {
  try {
    const exercicio = await Exercicio.findById(req.params.id)
    if (!exercicio)
      return res.status(404).json({ erro: 'Exercício não encontrado.' })
    res.json(exercicio)
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao buscar detalhes do exercício.' })
  }
})

// Rota para zerar banco em testes
app.get('/api/limpar-banco', async (req, res) => {
  try {
    await mongoose.connection.dropDatabase()
    await semearExerciciosIniciais()
    res.send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h2 style="color: #16a34a;">✓ Banco de dados apagado e reinicializado!</h2>
        <a href="/cadastro.html" style="color: #0284c7; font-weight: bold;">Ir para a tela de Cadastro</a>
      </div>
    `)
  } catch (erro) {
    res.status(500).send('Erro ao tentar apagar o banco: ' + erro.message)
  }
})

// Inicialização
app.listen(PORT, () => {
  console.log(`=========================================`)
  console.log(`Servidor rodando em: http://localhost:${PORT}`)
  console.log(`Cadastro:            http://localhost:${PORT}/cadastro.html`)
  console.log(`Login:               http://localhost:${PORT}/login.html`)
  console.log(`Home / Painel:       http://localhost:${PORT}/home.html`)
  console.log(`Vídeos / Exercícios: http://localhost:${PORT}/exercicios.html`)
  console.log(`=========================================`)
})
