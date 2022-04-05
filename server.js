const { json } = require("express");
const express = require("express");
const mongo = require("mongodb").MongoClient;
const http = require("http");

const app = express();

const url = `mongodb://${process.env.MONGODB_USERNAME}:${encodeURIComponent(process.env.MONGODB_PASSWORD)}@${process.env.MONGODB_HOST}:27017/${process.env.MONGODB_DATABASE}`;

function startWithRetry() {
  mongo.connect(url, { 
    useUnifiedTopology: true,
    useNewUrlParser: true,
    connectTimeoutMS: 1000,
    socketTimeoutMS: 1000,
  }, (err, client) => {
    if (err) {
      console.error(`Error connecting, retrying in 1 sec: ${err}`);
      setTimeout(startWithRetry, 1000);
      return;
    }

    const db = client.db(process.env.MONGODB_DATABASE);

    app.listen(8080, () => {
      app.get("/rentals/healthz", (req, res, next) => {
        res.sendStatus(200)
        return;
      });

      app.get("/rentals", (req, res, next) => {
        console.log(`GET /rentals`)
        db.collection('rentals').find().toArray( (err, results) =>{
          if (err){
            console.log(`failed to query rentals: ${err}`)
            res.json([]);
            return;
          }

          var options = {
            hostname: 'catalog',
            path: '/catalog',
            port: '8080',
            json: true
          };

          console.log("RAMON!")

          http.get(options, (res) => {
            res.on('data', data => {
              console.log(data);
            })
          })


          // http.request(options, function(error, response, body){
          //   console.log(response);
          // });
          //   res.on('data', data => {
          //     results.forEach((rental) => {
          //       if (rental.catalog_id == chunk.id) {
          //         rental.vote_average = chunk.vote_average;
          //         rental.original_title = chunk.original_title;
          //         rental.backdrop_path = chunk.backdrop_path;
          //         rental.overview = chunk.overview;
          //       }
          //       }
          //     });
          //   })

          // req.on('error', error => {
          //   console.error(error)
          // })

          // req.end()


          res.json(results);
        });
      });

      app.post("/rent", (req, res, next) => {
        console.log(`POST /rent`)
        var rent = { price: req.body["price"], catalog_id: req.body["catalog_id"] };
        db.collection('rentals').insertOne(rent).toArray( (err, results) =>{
          if (err){
            console.log(`failed to rent: ${err}`)
            res.json([]);
            return;
          }

          res.json(results);
        });
      });

      console.log("Server running on port 8080.");
    });
  });
};

startWithRetry();