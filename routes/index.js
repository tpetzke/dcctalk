var express = require('express');
var router = express.Router();
const Scoring = require('../classes/scoring');

/* GET home page. */
router.get('/', async function(req, res, next) {
    
  // Open reference to DB collection <players>
  const container =  req.questions;
   
  var querySpec;
  querySpec = {
    query: "SELECT top 1 c.News, TimestampToDateTime(c._ts*1000) as Date FROM c where c.Type='News' order by c._ts desc" 
  };
 
  const { resources: news } = await container.items.query(querySpec).fetchAll();
  if (news.length == 0) news.push({  
    "News": "WebSite initialised",
  })

  res.render('index', { title: 'Exam Trainer', news: news });

});

router.get('/register', async function(req, res, next) {
  
  res.render('register');

});

module.exports = router;
