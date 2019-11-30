{ // helpers: c, t, now, assign, jsonClone
  var c = console.log, { assign } = Object,

  jsonClone = obj => JSON.parse(JSON.stringify(obj))

  Object.defineProperty(global, 'now',
    { get: ()=> String(new Date).match(/\d+:\d+:\d+/)[0] } )

  let lastTime
  Object.prototype.c = function(label) {
    const time = now
    console.log(time == lastTime? '': lastTime = time,
      typeof label=='string'? label+':' : typeof label=='number'? label+'.' :'',
        this.valueOf())
    return this.valueOf()
  }

  let timestamp
  Object.prototype.t = function(label) {
    if (timestamp) {
      var ts = timestamp
      timestamp = process.hrtime().join('.')*1000
      console.log(typeof label=='string'? label+':'
        : typeof label=='number'? label+'.' :'', +(timestamp-ts).toFixed(3))
    }
    else timestamp = process.hrtime().join('.')*1000
    return this==global? null : this.valueOf()
  }
}

{ // mocking db with functions to work with it
  var db = {
    sess: JSON.parse(
      `[
        {
          "id": 1,
          "userid": 1,
          "datestart": 1575109978209,
          "datelast": 1575109978209,
          "tokens": [
            "s79hvfy526mbnoexcdj24f3mt2prsop86zdyp1iakug"
          ]
        },
        {
          "id": 2,
          "userid": 1,
          "datestart": 1575109996711,
          "datelast": 1575109996711,
          "tokens": [
            "svm8g8nuhyfj4l7x3tm54r8tgv8vkhmdbll9lpa6mb8"
          ]
        },
        {
          "id": 3,
          "userid": 1,
          "datestart": 1575109998068,
          "datelast": 1575109998068,
          "tokens": [
            "u4wnoizr04ahkpv6wex4cz3istcc8uzsh52dtipwdcq"
          ]
        },
        {
          "id": 4,
          "userid": 2,
          "datestart": 1575110001948,
          "datelast": 1575110001948,
          "tokens": [
            "qkzaedgl3on2u6mu95drtp0dndjrwja4hucsh3vs5e"
          ]
        },
        {
          "id": 5,
          "userid": 2,
          "datestart": 1575110003033,
          "datelast": 1575110003033,
          "tokens": [
            "fp4jvzyry6ccd3fedllil9o1trjzo9am9jfvqz1lg2v9"
          ]
        },
        {
          "id": 6,
          "userid": 2,
          "datestart": 1575110003929,
          "datelast": 1575110003929,
          "tokens": [
            "kdoscik22s8c9t76aduyn4r9xtxdb0fkenfokvy2ksls"
          ]
        }
      ]`
    ),
    users: [{id: 1, login: 'Alex', pass: 'jeronimo'},
            {id: 2, login: 'Brad', pass: 'box'}]
  },

  dbGetId = async ()=> Math.max(1,...db.sess.map(s => s.id)),

  dbAddSes = async ses => { db.sess.push(jsonClone(ses)) },

  dbGetSes = async sid => {
    const ses = db.sess.find(s => s.id==sid)
    return ses? jsonClone(ses) : null
  },

  dbGetLast = async n =>
    jsonClone(db.sess).sort((a, b)=> b.datelast-a.datelast).slice(0, n),

  dbGetOwn = async userid => jsonClone(db.sess.filter(s => s.userid==userid)),

  dbDelSes = async sid => {
    const i = db.sess.findIndex(s => s.id==sid)
    if (!~i) return false
    db.sess.splice(i, 1)
    return true
  }

  assign(global, {dbGetId, dbAddSes, dbGetSes, dbGetLast, dbGetOwn, dbDelSes})
}

const

rndStr = (i=4, f=()=>Math.random().toString(36).slice(2), s='') =>
  { for (;i;--i) s+=f(); return s },



sessions = [],

maxSess = 4, maxTokens = 4,

startSes = userid => {
  const token = rndStr(), id = ++maxId, datestart = Date.now(),
        ses = {id, userid, datestart, datelast: datestart, tokens: [token]}
  dbAddSes(ses)
  sessions.unshift(ses)
  if (sessions.length>maxSess) sessions.length = maxSess
  return {sid: id, token}
},

loadSess = async ()=> {sessions.splice(0, maxSess,...await dbGetLast(maxSess))},

delSes = async sid => {
  const i = sessions.findIndex(s => s.id==sid)
  if (~i) sessions.splice(i, 1)
  return ~i || await dbDelSes(sid)? true : false
},

checkSes =(sid, token)=> {
  let ses = sessions.find(s => s.id==sid)
  if (!ses) {
    ses = db.sess.find(s => s.id==sid)
    if (ses) {
      sessions.unshift(ses)
      sessions.length = maxSess
    }
  }
  if (!ses || !ses.tokens.includes(token)) return false
  token = rndStr()
  const datelast = Date.now()
  ses = sessions.splice(sessions.findIndex(s => s.id==sid), 1)[0]
  ses.datelast = datelast
  ses.tokens.unshift(token)
  ses.tokens.length = maxTokens
  sessions.unshift(ses)
  assign(db.sess.find(s => s.id==sid), {datelast, tokens: ses.tokens})
  return token
},

labelSes =(sid, label)=> {

}

var maxId = dbGetId()

loadSess()

setInterval(t, 1e6)

assign(global, {c, rndStr, startSes, loadSess, delSes, checkSes, db, sessions})