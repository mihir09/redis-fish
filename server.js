const express = require('express')
const axios = require('axios')
const redis = require("redis");

const app = express()
app.use(express.json())

let redisClient;

(async () => {
  redisClient = redis.createClient();

  redisClient.on("error", (error) => console.error(`Error : ${error}`));

  await redisClient.connect();
})();

async function fetchApiData(species) {
    const apiResponse = await axios.get(
      `https://www.fishwatch.gov/api/species/${species}`
    );
    return apiResponse.data;
}

async function getSpeicesData(req, res){
    const species = req.params.species
    let results;
    let isCached = false;

    try{
        const cacheResults = await redisClient.get(species);
        if (cacheResults) {
            isCached = true;
            results = JSON.parse(cacheResults);
        
        } else {
            results = await fetchApiData(species);
            if(results.length === 0){
                console.log("Not found")
                throw new Error("Not found");
            }
            await redisClient.set(species, JSON.stringify(results), {
                EX: 10,
                NX: false,
            });
        }
        res.send({
            fromCache: isCached,
            data: results
        })
    }catch(error){
        res.send(404).send('Data not available')
    }
}

app.get("/fish/:species", getSpeicesData);

app.listen(3000, ()=>{
    console.log("http://localhost:3000");
})