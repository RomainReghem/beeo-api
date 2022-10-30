const express = require('express')
const app = express()
const port = 3000
require('dotenv').config()
const pgp = require('pg-promise')(/* options */)
const db = pgp(`${process.env.DIALECT}://${process.env.USER}:${process.env.PASSWORD}@${process.env.HOST}:${process.env.PORT}/${process.env.DB}`)

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/api/test', (req, res) => {
  db.query('SELECT * FROM public.installationsclassees_france ORDER BY gid ASC')
    .then((data) => {
      console.log('DATA:', data)
    })
    .catch((error) => {
      console.log('ERROR:', error)
    })
  res.send('test')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})