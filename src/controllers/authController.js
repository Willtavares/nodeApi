const express = require('express')
const User = require('../models/user')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const authconfig = require('../config/auth')

const router = express.Router()

function gemerateToken(params = {  }) {
    return jwt.sign(params, authconfig.secret, {
        expiresIn: 86400
        // Este 86400 acima é a quantia de segundos em um dia
    })
}

router.get('/', async(req, res) => {
    
})

router.post('/register', async(req, res) => {
    const { email } = req.body

    try {
        if (await User.findOne({email})) {
            return res.status(400).send({error: 'Este usuário já existe'})
        }
        const user = await User.create(req.body)

        // Para retirar o Password do Usuário
        // user.password = undefined

        return res.send({ 
            user, 
            token: gemerateToken({ id: user.id }) 
        })
    } catch (error) {
        return res.status(400).send({error: 'Registration Failed'})
    }
})


router.post('/authenticate', async(req, res) => {
    const {email, password} = req.body

    const user = await User.findOne({ email }).select('+password')

    if (!user) 
        return res.status(400).send({ error: 'User not Found' })
    

    if (!await bcrypt.compare(password, user.password)) 
        return res.status(400).send({ error: 'Invalid Password' })


    user.password = undefined
    

    
    res.send({ 
        user, 
        token: gemerateToken({ id: user.id }) 
    })
})

module.exports = app => app.use('/auth', router)