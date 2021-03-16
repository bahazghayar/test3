'use strict';

const express = require('express');
const superagent = require('superagent');
const cors = require('cors');
const methodOverride = require('method-override');
const pg = require('pg');


const PORT = process.env.PORT || 4000;
const app = express();

require('dotenv').config();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static('./public'));
app.set('view engine', 'ejs');


// const client = new pg.Client(process.env.DATABASE_URL);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL,   ssl: { rejectUnauthorized: false } });

// Routes
app.get('/', homeHandler);
app.get('/getCountryResult', getCountryResultHandler);
app.get('/allCountries', allCountriesHandler);
app.post('/myRecords', myRecordsHandler);
app.get('/myRecords', myRecordsHandler2);
app.get('/recordDetails/:id', recordDetailsHandler);
app.put('/updateRecordDetails/:id', updateRecordDetailsHandler);
app.delete('/deleteRecordDetails/:id', deleteRecordDetailsHandler);

// Handlers
function homeHandler(req, res) {
    let url = `https://api.covid19api.com/world/total`;

    superagent.get(url)
        .then((data) => {
            res.render('pages/home', { data: data.body })
        })
}

function getCountryResultHandler(req, res) {
    let { country, from, to } = req.query;
    let url = `https://api.covid19api.com/country/${country}/status/confirmed?from=${from}T00:00:00Z&to=${to}T00:00:00Z`;

    superagent.get(url)
        .then((data) => {
            let countryData = data.body.map((item) => {
                return new OneCountry(item);
            })

            res.render('pages/getCountryResult', { data: countryData });
        })
}

function allCountriesHandler(req, res) {
    let url = `https://api.covid19api.com/summary`;
    superagent.get(url)
        .then((data) => {
            let allContriesData = data.body.Countries.map((item) => {
                return new AllCountries(item)
            })
            res.render('pages/allCountries', { data: allContriesData })
        })
}

function myRecordsHandler(req, res) {
    let { country, totalconfirmed, totaldeaths, totalrecovered, date } = req.body;
    let sql = `INSERT INTO countries3 (country,totalconfirmed, totaldeaths, totalrecovered,date) VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
    let values = [country, totalconfirmed, totaldeaths, totalrecovered, date];

    client.query(sql, values)
        .then((results) => {
            res.redirect('/myRecords')
        })
}

function myRecordsHandler2(req, res) {
    let sql = `SELECT * FROM countries3;`;
    client.query(sql)
        .then((results) => {
            //    console.log(results.rows);
            res.render('pages/myRecords', { data: results.rows })
        })
}

function recordDetailsHandler(req, res) {
    let id = req.params.id;
    let sql = `SELECT * FROM countries3 WHERE id=$1;`;
    let value = [id];

    client.query(sql, value)
        .then((results) => {
            console.log(results.rows);
            res.render('pages/recordDetails', { data: results.rows[0] });
        })
}

function updateRecordDetailsHandler(req, res) {
    let id = req.params.id ;
    let {country, totalconfirmed, totaldeaths, totalrecovered, date} = req.body ;
    
    let sql = `UPDATE countries3 SET country=$1, totalconfirmed=$2, totaldeaths=$3, totalrecovered=$4, date=$5 WHERE id=$6;` ;
    let values = [country, totalconfirmed, totaldeaths, totalrecovered, date, id] ;

    client.query(sql,values)
    .then((results)=>{
              res.redirect(`/recordDetails/${id}`)
    })
}

function deleteRecordDetailsHandler(req, res) {
    let id = req.params.id;
	let sql = 'DELETE FROM countries3 WHERE id=$1;';
	let value = [id];
	client.query(sql, value)
    .then((results) => {
		res.redirect('/myRecords');
	});
}

// Constructors 
function OneCountry(data) {
    this.country = data.Country;
    this.cases = data.Cases;
    this.date = data.Date;
}

function AllCountries(data) {
    this.country = data.Country;
    this.totalconfirmed = data.TotalConfirmed;
    this.totaldeaths = data.TotalDeaths;
    this.totalrecovered = data.TotalRecovered;
    this.date = data.Date;
}

client.connect()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Listening on PORT ${PORT}`)

        })
    })