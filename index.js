const express = require('express')
const app = express()
const cors = require('cors');

app.use(cors({
  origin: '*'
}));

require('dotenv').config()
const pgp = require('pg-promise')(/* options */)
const db = pgp(`${process.env.DIALECT}://${process.env.USER}:${process.env.PASSWORD}@${process.env.HOST}:${process.env.PORT}/${process.env.DB}`)

app.get('/', (req, res) => {
  res.send('Hello World!')
})

const eq_table = {
  indus: {
    table: 'public.installationsclassees_france',
    display: 'nom_ets'
  }
}

app.get('/api/layers', (req, res) => {
  // db.query('SELECT * FROM public.installationsclassees_france ORDER BY gid ASC')
  db.query(`SELECT jsonb_build_object(
    'type',     'FeatureCollection',
    'features', jsonb_agg(features.feature)
)
FROM (
  SELECT jsonb_build_object(
    'type',       'Feature',
    'id',         gid,
    'geometry',   ST_AsGeoJSON(geom)::jsonb,
    'properties', to_jsonb(inputs) - 'gid' - 'geom'
  ) AS feature
  FROM (SELECT * FROM ${eq_table[req.query.layer].table}) inputs) features;`)
    .then((data) => {
      return res.send(data[0].jsonb_build_object)
    })
    .catch((error) => {
      console.log('ERROR:', error)
    })
})

app.get('/api/search', async (req, res) => {
  let allData = {};
  const tables = Object.keys(eq_table)
  for await (const table of tables) {
    await db.query(`SELECT ${eq_table[table].display}, ST_AsGeoJSON(geom)::jsonb, gid FROM ${eq_table[table].table} WHERE LOWER(${eq_table[table].display}) LIKE '%${req.query.content}%'`)
      .then((data) => {
        allData[table] = data
      })
      .catch((error) => {
        console.log('ERROR:', error)
      })
  };
  return res.send(allData)
})

app.get('/api/one', async (req, res) => {
  db.query(`SELECT jsonb_build_object(
    'type',     'FeatureCollection',
    'features', jsonb_agg(features.feature)
)
FROM (
  SELECT jsonb_build_object(
    'type',       'Feature',
    'id',         gid,
    'geometry',   ST_AsGeoJSON(geom)::jsonb,
    'properties', to_jsonb(inputs) - 'gid' - 'geom'
  ) AS feature
  FROM (SELECT * FROM ${eq_table[req.query.layer].table} WHERE gid=${req.query.gid}) inputs) features;`)
    .then((data) => {
      return res.send(data[0].jsonb_build_object)
    })
    .catch((error) => {
      console.log('ERROR:', error)
    })
})


app.listen(3000, () => {
  console.log(`Example app listening on port ${3000}`)
})