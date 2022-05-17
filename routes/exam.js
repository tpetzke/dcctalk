var express = require('express');
const app = require('../app');
var router = express.Router();
const Scoring = require('../classes/scoring');

const CODE = 'AZ-204';
const REVIEW_PAGE = -1;
const SCORING_PAGE = -2;
const QUESTION_POOL_SQL = "SELECT * FROM c where c.Exam='"+ CODE+"'"; // tmp

/* Maintenance function to perform an update operation of items in the database */
router.get('/update', async function(req, res, next) {
  try {
    
    const container =  req.questions;

    var querySpec;
    querySpec = {
      query: QUESTION_POOL_SQL    
    };
   
    const { resources: questions } = await container.items.query(querySpec).fetchAll();

    for (i = 0; i < questions.length; i++) {
      questions[i].Number = i;

      const { resource : updated } = container.item(questions[i].id).replace(questions[i]);
    }
    res.forward('/');

  } catch {
    res.render('error', { message: 'Error' });
  }
});

router.get('/catalog', async function(req, res, next) {
  try {
    // Open reference to DB collection <players>
    const container =  req.questions;
   
    var querySpec;
    querySpec = {
      query: "SELECT c.Exam, max(TimestampToDateTime(c._ts*1000)) AS Date, count(1) as Count from c where c.Exam != 'None' group by c.Exam" 
    };
   
    let i;
    const { resources: content } = await container.items.query(querySpec).fetchAll();
    for (i = 0; i < content.length; i++) {
      content[i].Name = Scoring.getExamName(content[i].Exam);
    }

    res.render('catalog', { title: 'Exam Trainer', content: content });

  } catch {
    res.render('error', { title: 'Express' });
  }
});

router.post('/examintro', async function(req, res, next) {
  try {
    
    var code = req.body.code;
    var page = Scoring.getExamDetails(code);

    const container =  req.questions;
   
    var querySpec;
    querySpec = {
      query: "SELECT c.Exam, max(TimestampToDateTime(c._ts*1000)) AS Date, count(1) as Count from c where c.Exam = @exam group by c.Exam",
      parameters: [
        { name: "@exam", value: code }
      ]
    };
    const { resources: content } = await container.items.query(querySpec).fetchAll();

    if (content.length > 0) {
      page.Count = content[0].Count; 
      const date = new Date(content[0].Date);
      const dateStr = date.toLocaleDateString('en-GB', {  
        day:   'numeric',
        month: 'short',
        year:  'numeric',
      }); 
      page.Date = dateStr;
    }

    res.render('examintro', { title: code, page: page });
  } catch
  {
    res.render('error', { title: 'Error' });
  }
});

// The init method gets the exam as parameter /init/az-204
router.get('/init/:exam', async function(req, res, next) {
  try {

    var exam = 'AZ-104'; // default
    if(typeof req.params.exam != 'undefined') exam = req.params.exam;

    // Open reference to DB collection <players>
    const container =  req.questions;
   
    var querySpec;
    querySpec = {
      query: "SELECT * from c where c.Exam = @exam",
      parameters: [
        { name: "@exam", value: exam }
      ]
    };
   
    const { resources: questions } = await container.items.query(querySpec).fetchAll();

    inputs = {
      "inputs" : [],
    }

    let i,j;
    var questionIds = "";
    for (i=0; i< questions.length; i++) {
      questionIds += questions[i].id;
      if (i < questions.length-1) questionIds += ",";
      
      var answer = {
        "review"  : questions[i].Reviewable - 1,      // -1 question cannot be reviewed, 0: question not marked, 1: marked
        "answer"  : [],
        "correct" : [],
        points    : 0,
        maxpoints : 0
      };
    
      for (j=0; j<questions[i].Questions.length; j++) {
        answer.answer.push(-1);
      }
      inputs.inputs.push(answer);
    }

    var page = {
      exam: exam,
      questionNo : 0,
      questionTotals : inputs.inputs.length,
      examName: "Microsoft "+CODE+" "+Scoring.getExamName(CODE),
      timeRemaining : 3600, 
      questionIds : questionIds,
      inputs : JSON.stringify(inputs),
      startTimestamp : Math.floor(Date.now() / 1000),
      totalTimeSec : 6000,
      filter:"all",                 // all, review, answered, unanswered
      question : { Type : "None", Questions: [] }
    }  

    res.render('ready4exam', { title: 'Exam', page: page });
  } catch
  {
    res.render('index', { title: 'Error' });
  }

});

/* POST Controller */
router.post('/controller', async function(req, res, next) {
  
  const container =  req.questions;

  // Get our form values. These rely on the "name" attributes
  var exam = req.body.exam;
  var questionNo = req.body.questionNo;
  var parts = req.body.parts;
  var questionType = req.body.questionType;
  var questionIds = req.body.questionIds.split(',');
  var action = req.body.action;
  var inputs = JSON.parse(req.body.inputs);
  var startTimestamp = parseInt(req.body.startTimestamp);
  var totalTimeSec = parseInt(req.body.totalTimeSec);
  var filter = req.body.filter;

  // When we launch the exam we restart the clock
  if (action == "Start") {
    startTimestamp = Math.floor(Date.now() / 1000);
  }

  // First we check whether we come from the review page, so we have no current question or answer but give a new question depending
  // the <action> selection of the review page   "Answered", "Unanswered", "Review", "Finish"
  if (action == "Review" || action == "Answered" || action == "Unanswered") {
    filter = action.toLowerCase();
    action = "First";
  }

  if (action == "Finish") {
    filter = "";
    action = "Scoring";
  }

  var answer;

  if (req.body.review) inputs.inputs[questionNo].review = parseInt(req.body.review[0]);

  if (questionType == 'Select-1') {
    for (i=0; i<parts; i++) 
    {
      switch (i) {
        case 0: inputs.inputs[questionNo].answer[i] = req.body.radio_0 || -1; break;
        case 1: inputs.inputs[questionNo].answer[i] = req.body.radio_1 || -1; break;
        case 2: inputs.inputs[questionNo].answer[i] = req.body.radio_2 || -1; break;
        case 3: inputs.inputs[questionNo].answer[i] = req.body.radio_3 || -1; break;
      }  
    }
  } else if (questionType == 'Scenario') {
    for (i=0; i<parts; i++) 
    {
      switch (i) {
        case 0: inputs.inputs[questionNo].answer[i] = req.body.radio_0 || -1; break;
        case 1: inputs.inputs[questionNo].answer[i] = req.body.radio_1 || -1; break;
        case 2: inputs.inputs[questionNo].answer[i] = req.body.radio_2 || -1; break;
        case 3: inputs.inputs[questionNo].answer[i] = req.body.radio_3 || -1; break;
      }  
    }
  } else if (questionType == 'Select-M') {
    for (i=0; i<parts; i++) 
    {
      switch (i) {
        case 0: if (req.body.cb_0) { idx = 0; for (j=0; j < req.body.cb_0.length; j++) idx += parseInt(req.body.cb_0[j]); inputs.inputs[questionNo].answer[i] = idx; } break;
        case 1: if (req.body.cb_1) { idx = 0; for (j=0; j < req.body.cb_1.length; j++) idx += parseInt(req.body.cb_1[j]); inputs.inputs[questionNo].answer[i] = idx; } break;
        case 2: if (req.body.cb_2) { idx = 0; for (j=0; j < req.body.cb_2.length; j++) idx += parseInt(req.body.cb_2[j]); inputs.inputs[questionNo].answer[i] = idx; } break;
        case 3: if (req.body.cb_3) { idx = 0; for (j=0; j < req.body.cb_3.length; j++) idx += parseInt(req.body.cb_3[j]); inputs.inputs[questionNo].answer[i] = idx; } break;
      }  
    }
  } else if (questionType == 'YesNo') {
    for (i=0; i<parts; i++) 
    {
      switch (i) {
        case 0: inputs.inputs[questionNo].answer[i] = req.body.radio_0 || -1; break;
        case 1: inputs.inputs[questionNo].answer[i] = req.body.radio_1 || -1; break;
        case 2: inputs.inputs[questionNo].answer[i] = req.body.radio_2 || -1; break;
        case 3: inputs.inputs[questionNo].answer[i] = req.body.radio_3 || -1; break;
      }
    }
  } else if (questionType == 'Dropdown') {
    for (i=0; i<parts; i++) 
    {
      switch (i) {
        case 0: inputs.inputs[questionNo].answer[i] = req.body.drop_0; break;
        case 1: inputs.inputs[questionNo].answer[i] = req.body.drop_1; break;
        case 2: inputs.inputs[questionNo].answer[i] = req.body.drop_2; break;
        case 3: inputs.inputs[questionNo].answer[i] = req.body.drop_3; break;
      }  
    }
  }

  console.log("Question: ",questionNo," id: ",questionIds[questionNo]," answer: ",inputs.inputs[questionNo]," action: ",action);

  var newQuestionNo = getNextQuestionIndex(inputs, filter, parseInt(questionNo), action);
  console.log("New Question No: ",newQuestionNo);

  // init the defaults for the page that remain unchanged
  var page = {
    exam : exam,
    questionNo : newQuestionNo,
    question : { Type : "None", Questions: [] },
    questionTotals : questionIds.length,
    timeRemaining : 3600,
    questionIds : questionIds,
    inputs : JSON.stringify(inputs),
    startTimestamp : startTimestamp,
    totalTimeSec : req.body.totalTimeSec,
    filter : filter
  }

  if (newQuestionNo == REVIEW_PAGE) { 
    page.answered = getAnswered(inputs);
    page.review = getReview(inputs);
    page.unanswered = getUnanswered(inputs);
    
    return res.render('review', { title: 'Exam', page: page });     // Last question was asked, forward to review summary
  }

  if (newQuestionNo == SCORING_PAGE) { 
    
    var querySpec;
    querySpec = {
      query: "SELECT * from c where c.Exam = @exam",
      parameters: [
        { name: "@exam", value: exam }
      ]
    };
   
    const { resources: questions } = await container.items.query(querySpec).fetchAll();
    
    const scoring = new Scoring(questions, questionIds, inputs); 
    inputs = scoring.getScoredInput();    
    page.inputs = JSON.stringify(inputs);
    
    var details = scoring.getScoreDetails();

    return res.render('scoring', { title: 'Exam', page: page, details: details });     // Review finished, forward to scoring summary
  }


  var newQuestionId = questionIds[newQuestionNo];    

  var querySpec;
  querySpec = {
    query: "SELECT * FROM c where c.id = '" + newQuestionId + "'"
  };

  const { resources: questions } = await container.items.query(querySpec).fetchAll();

  // setup the new question
  page.questionNo = newQuestionNo;
  page.question = questions[0];

  if (page.question.Type == 'Select-1') res.render('select_1', { title: 'Exam', page: page }); else  // Todo: Might be a different question type
  if (page.question.Type == 'Select-M') res.render('select_M', { title: 'Exam', page: page }); else
  if (page.question.Type == 'YesNo') res.render('yesno', { title: 'Exam', page: page }); else
  if (page.question.Type == 'Dropdown') res.render('dropdown', { title: 'Exam', page: page }); else 
  if (page.question.Type == 'Scenario') res.render('scenario', { title: 'Exam', page: page }); 
});

/* POST Controller */
router.post('/reviewer', async function(req, res, next) {
  
  const container =  req.questions;

  // Get our form values. These rely on the "name" attributes
  var exam = req.body.exam;
  var questionNo = req.body.questionNo;
  var parts = req.body.parts;
  var questionType = req.body.questionType;
  var questionIds = req.body.questionIds.split(',');
  var action = req.body.action;
  var inputs = JSON.parse(req.body.inputs);
  var startTimestamp = parseInt(req.body.startTimestamp);
  var totalTimeSec = parseInt(req.body.totalTimeSec);
  var filter = req.body.filter;

  // First we check whether we come from the scoring page, so we have no current question but give a new question depending
  // the <action> selection of the scoring page   "Answers" indicates a review of the given answers and display of explanations
  if (action == "Answers") { 
    filter = req.body.dd_answers;
    action = "First";
  }

  var newQuestionNo = getNextQuestionIndexRev(inputs, filter, parseInt(questionNo), action);
  console.log("New Question No: ",newQuestionNo);

  // init the defaults for the page that remain unchanged
  var correct = "";
  if (newQuestionNo >= 0) correct = inputs.inputs[newQuestionNo].points == inputs.inputs[newQuestionNo].maxpoints ? "Correct" : "Incorrect";

  var page = {
    exam : exam,
    questionNo : newQuestionNo,
    question : { Type : "None", Questions: [] },
    correct: correct,
    questionTotals : questionIds.length,
    timeRemaining : 6000,
    questionIds : questionIds,
    inputs : JSON.stringify(inputs),
    startTimestamp : startTimestamp, // = req.body.startTimestamp,
    totalTimeSec : req.body.totalTimeSec,
    filter : filter
  }

  if (newQuestionNo == SCORING_PAGE) { 
    
    var querySpec;
    querySpec = {
      query: QUESTION_POOL_SQL    
    };
   
    const { resources: questions } = await container.items.query(querySpec).fetchAll();
    
    const scoring = new Scoring(questions, questionIds, inputs); 
    inputs = scoring.getScoredInput();    
    page.inputs = JSON.stringify(inputs);
    
    var details = scoring.getScoreDetails();

    return res.render('scoring', { title: 'Exam', page: page, details: details });     // return to scoring summary
  }

  var newQuestionId = questionIds[newQuestionNo];    

  var querySpec;
  querySpec = {
    query: "SELECT * FROM c where c.id = '" + newQuestionId + "'"
  };

  const { resources: questions } = await container.items.query(querySpec).fetchAll();

  // setup the new question
  page.questionNo = newQuestionNo;
  page.question = questions[0];

  if (page.question.Type == 'Select-1') res.render('select_1_rev', { title: 'Exam', page: page }); else  // Todo: Might be a different question type
  if (page.question.Type == 'Select-M') res.render('select_M_rev', { title: 'Exam', page: page }); else
  if (page.question.Type == 'YesNo') res.render('yesno_rev', { title: 'Exam', page: page }); else
  if (page.question.Type == 'Dropdown') res.render('dropdown_rev', { title: 'Exam', page: page }); else 
  if (page.question.Type == 'Scenario') res.render('scenario_rev', { title: 'Exam', page: page }); 
});

//
// HELPER FUNCTIONS
//

function getAnswered(inputs) {
  let cnt = 0;
  for (i=0; i<inputs.inputs.length; i++) {
    let complete = true;
    for (j=0; j<inputs.inputs[i].answer.length; j++) if (inputs.inputs[i].answer[j] < 0) complete = false;
    if (complete) cnt++;
  }

  return cnt;
}

function isAnswered(answer) {
  let complete = true;
  for (j=0; j < answer.answer.length; j++) if (answer.answer[j] < 0) complete = false;
  return complete;
}

function isUnanswered(answer) {
  return !isAnswered(answer);
}

function isReviewable(input) {
  return input.review >= 0;
}

function getReview(inputs) {
  let cnt = 0;
  for (i=0; i<inputs.inputs.length; i++) {
    if (inputs.inputs[i].review == 1) cnt++;
  }

  return cnt;
}

function getUnanswered(inputs) {
  let cnt = 0;
  for (i=0; i<inputs.inputs.length; i++) {
    let complete = true;
    for (j=0; j<inputs.inputs[i].answer.length; j++) if (inputs.inputs[i].answer[j] < 0) complete = false;
    if (!complete) cnt++
  }

  return cnt;
}

function getNextQuestionIndex(inputs, filter, currentIndex, action) {

  let idx = action == "Scoring" ? SCORING_PAGE : REVIEW_PAGE;  // default if no new question ids is available 
  let COUNT = inputs.inputs.length;

  if (action == "Start" && COUNT > 0) return 0;  // We launch the exam with question no 0


  if (filter == "all") {    // in exam mode  

    var it = action == "Next" ? 1 : -1;   // go forward or backward
    currentIndex += it; 
    for (i = currentIndex; i >= 0 && i < COUNT; i = i + it) if (isReviewable(inputs.inputs[i]) || (action == "Next" && isUnanswered(inputs.inputs[i]))) return i;  // previous questions must be reviewable
  }

  if (filter == "review") {    // review mode - so navigate between questions marked for review  
  
    if (action == "First") {
      for (i = 0; i < COUNT; i++) if (inputs.inputs[i].review == 1) return i;
      return idx;
    }

    var it = action == "Next" ? 1 : -1;   // go forward or backward
    currentIndex += it; 
    for (i = currentIndex; i >= 0 && i < COUNT; i = i + it) if (inputs.inputs[i].review == 1) return i;
  }

  if (filter == "answered") {    // review mode - here we navigate between questions that are answered  
  
    if (action == "First") {
      for (i = 0; i < COUNT; i++) if (isAnswered(inputs.inputs[i]) && isReviewable(inputs.inputs[i])) return i;
      return idx;
    }

    var it = action == "Next" ? 1 : -1;   // go forward or backward
    currentIndex += it; 
    for (i = currentIndex; i >= 0 && i < COUNT; i = i + it) if (isAnswered(inputs.inputs[i]) && isReviewable(inputs.inputs[i])) return i;
  }

  if (filter == "unanswered") {    // review mode - here we navigate between questions that are answered  
  
    if (action == "First") {
      for (i = 0; i < COUNT; i++) if (isUnanswered(inputs.inputs[i]) && isReviewable(inputs.inputs[i])) return i;
      return idx;
    }

    var it = action == "Next" ? 1 : -1;   // go forward or backward
    currentIndex += it;
    for (i = currentIndex; i >= 0 && i < COUNT; i = i + it) if (isUnanswered(inputs.inputs[i]) && isReviewable(inputs.inputs[i])) return i;
  }
  
  return idx;
}

function getNextQuestionIndexRev(inputs, filter, currentIndex, action) {
  
  let idx = SCORING_PAGE;  // default if no new question ids is available 
  let COUNT = inputs.inputs.length;

  if (filter == "answers") {      
  
    if (action == "First" && COUNT > 0) return 0;
    if (action == "Next" && currentIndex < COUNT-1) return currentIndex + 1;
    if (action == "Previous" && currentIndex > 0) return currentIndex - 1;                  
  }

  if (filter == "correct") {      
  
    if (action == "First") {
      for (i = 0; i < COUNT; i++) if (inputs.inputs[i].points == inputs.inputs[i].maxpoints) return i;
      return idx;
    }

    var it = action == "Next" ? 1 : -1;   // go forward or backward
    currentIndex += it; 
    for (i = currentIndex; i >= 0 && i < COUNT; i = i + it) if (inputs.inputs[i].points == inputs.inputs[i].maxpoints) return i;
  }

  if (filter == "incorrect") {      
  
    if (action == "First") {
      for (i = 0; i < COUNT; i++) if (inputs.inputs[i].points != inputs.inputs[i].maxpoints) return i;
      return idx;
    }

    var it = action == "Next" ? 1 : -1;   // go forward or backward
    currentIndex += it; 
    for (i = currentIndex; i >= 0 && i < COUNT; i = i + it) if (inputs.inputs[i].points != inputs.inputs[i].maxpoints) return i;
  }
  
  return idx;
}

module.exports = router;