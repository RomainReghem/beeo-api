const express = require('express')
const app = express()
const cors = require('cors');

app.use(cors({
  origin: '*'
}));

require('dotenv').config()
const pgp = require('pg-promise')(/* options */)
const db = pgp(`${process.env.DIALECT}://${process.env.USER}:${process.env.PASSWORD}@${process.env.HOST}:${process.env.DBPORT}/${process.env.DB}`)

app.get('/', (req, res) => {
  res.send('Hello World!')
})

// Table : name of the table in the database
// Display : What we want to display in the search section
// Search : Can the user search inside this database
// Dpt : What's the column with the department info
const eq_table = {
  indus: { table: 'indus', display: 'nom_ets', search: true, dpt: null },
  eol: { table: 'eol', display: 'id_aerogen', search: true, dpt: 'code_dept' },
  fbio: { table: 'fbio', display: 'produits', search: true, dpt: null },
  zbio: { table: 'zbios', display: 'LBL_CULTU', search: false, dpt: null },
  riv: { table: 'riv', display: 'Libelle', search: true, dpt: null },
  pollu: { table: 'pollu', display: 'nom_site', search: true, dpt: 'code_dpt' },
  inci: {table: 'inci', display:'exploitant', search:true, dpt:'c_dept'},
  dechets:{table: 'dechets', display:'', search:true, dpt:null},
}

app.get('/api/layers', (req, res) => {
  // db.query(`SELECT * FROM ${eq_table[req.query.layer].table}`).then((data) => console.log(data))
  let where
  let where2
  if (req.query.dpt && eq_table[req.query.layer].dpt && req.query.dpt != 1) {
    where = `WHERE ${eq_table[req.query.layer].dpt}::int=${req.query.dpt}`
  } else where = 'WHERE true'

  if (req.query.layer == "zbio") {
    where2 = `ST_Contains('${req.query.bounds}', geom) LIMIT 1000`
    // where2 = `ST_Distance('${req.query.bounds}', geom) < 0.00001`
  } else where2 = 'true'
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
  FROM (SELECT * FROM ${eq_table[req.query.layer].table} ${where} AND ${where2})  inputs) features;`)
    .then((data) => {
      // console.log(data)
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
    console.log(table)
    if (eq_table[table].search) {
      await db.query(`SELECT ${eq_table[table].display}, ST_AsGeoJSON(geom)::jsonb, gid FROM ${eq_table[table].table} WHERE LOWER(${eq_table[table].display}) LIKE '%${req.query.content}%'`)
        .then((data) => {
          console.log(data)
          allData[table] = data
        })
        .catch((error) => {
          console.log('ERROR:', error)
        })
    }
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


app.listen((process.env.PORT || 3000), () => {
  console.log(`Example app listening on port ${3000}`)
})