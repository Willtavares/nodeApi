const express = require('express')
const User = require('../models/user')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const mailer = require('../../modules/mailer')

const authconfig = require('../../config/auth')

const router = express.Router()

function generateToken(params = {}) {
    return jwt.sign(params, authconfig.secret, {
      expiresIn: 86400,
    });
  }

router.get('/', async(req, res) => {
    res.status(200).send('Esta é a raiz da Categoria Auth')
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
            token: generateToken({ id: user.id }) 
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
        token: generateToken({ id: user.id }) 
    })
})


router.post('/forgot_password', async(req,res) => {
    const { email } = req.body;

    try {
      const user = await User.find({ email });
  
      if (!user)
        return res.status(400).send({ error: 'User not found' });
  
      const token = crypto.randomBytes(20).toString('hex');
  
      const now = new Date();
      now.setHours(now.getHours() + 1);
  
      await User.findByIdAndUpdate(user.id, {
        '$set': {
          passwordResetToken: token,
          passwordResetExpires: now,
        }
      });

      mailer.sendMail({
          to: email,
          from: 'willtavares@outlook.com',
          template: 'auth/forgot_password',
          context: {token},
      }, (error) => {
          if(error)
            return res.status(400).send({ error: 'Cannot send forgot password'})

            return res.send()
      })
        
    } catch (error) {
        res.status(400).send({ error: 'Errou on forgot Password, try again'})
    }
})

router.post('/reset_password', async (req, res) => {
    const { email, token, password } = req.body;
  
    try {
      const user = await User.findOne({ email })
        .select('+passwordResetToken passwordResetExpires');
  
      if (!user)
        return res.status(400).send({ error: 'User not found' });
  
      if (token !== user.passwordResetToken)
        return res.status(400).send({ error: 'Token invalid' });
  
      const now = new Date();
  
      if (now > user.passwordResetExpires)
        return res.status(400).send({ error: 'Token expired, generate a new one' });
  
      user.password = password;
  
      await user.save();
  
      res.send();
    } catch (err) {
      res.status(400).send({ error: 'Cannot reset password, try again' });
    }
  });

module.exports = app => app.use('/auth', router)