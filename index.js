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
    users: [{id: 1, login: 'Alex', pass: 'jeronimo', timeout: 230e3},
            {id: 3, login: 'Alex', pass: 'jeronimo', timeout: 555},
            {id: 2, login: 'Brad', pass: 'box', timeout: 2e9}],
    sess: JSON.parse(`[
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
        "datelast": 1575225385622,
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
        "timeout": 122400000,
        "tokens": [
          "qkzaedgl3on2u6mu95drtp0dndjrwja4hucsh3vs5e"
        ]
      },
      {
        "id": 5,
        "userid": 2,
        "datestart": 1575110003033,
        "datelast": 1575110003033,
        "timeout": 108000000,
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
    ]`)
  },

  dbGetId = async ()=> Math.max(1,...db.sess.map(s => s.id)),

  dbAddSes = async ses => db.sess.push(jsonClone(ses)),

  dbUpdSes = async ses => {
    await dbDelSes(ses.id)
    return await dbAddSes(ses)
  },

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
  },

  dbSetUserTimeout = async (userid, timeout)=>
    db.users.find(u => u.id==userid).timeout = timeout,

  dbUserTimeouts = async ids =>
    jsonClone((ids? db.users.filter(u => ids.includes(u.id)) : db.users)
      .reduce((obj, u)=> ({...obj, [u.id]: u.timeout}), {})),

  dbClearSess = async ()=> {
    const timeouts = await dbUserTimeouts()
    db.sess.splice(0, db.sess.length, ...db.sess.filter(s => {
      if (s.timeout) return Date.now()-s.timeout>s.datelast? false : true
      return (timeouts[s.userid] &&
        Date.now()-timeouts[s.userid]>s.datelast)? false : true
    }))
  },

  dbSessUserTimeouts = async ()=> await dbUserTimeouts(db.sess.map(s=>s.userid))

  assign(global, {dbGetId, dbAddSes, dbGetSes, dbGetLast, dbGetOwn, dbDelSes, dbUserTimeouts, dbClearSess, dbSessUserTimeouts})
}

const maxSess = 4, maxTokens = 4, sessions = []

sessions.inshift = ses =>
  sessions.length = Math.min(maxSess, sessions.unshift(ses))

const

rndStr = (i=4, f=()=>Math.random().toString(36).slice(2), s='') =>
  { for (;i;--i) s+=f(); return s },

startSes = userid => {
  const token = rndStr(), id = ++maxId, datestart = Date.now(),
        ses = {id, userid, datestart, datelast: datestart, tokens: [token]}
  dbAddSes(ses)
  sessions.inshift(ses)
  return {sid: id, token}
},

loadSess = async ()=> {sessions.splice(0, maxSess,...await dbGetLast(maxSess))},

delSes = async sid => {
  const i = sessions.findIndex(s => s.id==sid)
  if (~i) sessions.splice(i, 1)
  return ~i || await dbDelSes(sid)? true : false
},

checkSes = async (sid, token)=> {
  let ses = sessions.find(s => s.id==sid)
  if (!ses && (ses = await dbGetSes(sid))) sessions.inshift(ses)
  if (!ses || !ses.tokens.includes(token)) return false
  const datelast = Date.now()
  if (ses.timeout && datelast-ses.timeout>ses.datelast) return false
  token = rndStr()
  ses = sessions.splice(sessions.findIndex(s => s.id==sid), 1)[0]
  ses.datelast = datelast
  ses.tokens.unshift(token)
  ses.tokens.length = maxTokens
  sessions.unshift(ses)
  dbUpdSes(ses)
  return token
},

labelSes = async (sid, label)=> {
  let ses = sessions.find(s => s.id==sid)
  if (!ses) ses = await dbGetSes(sid)
  if (!ses) return false
  ses.label = label
  return await dbUpdSes(ses) && true
}

limitSes = async (sid, timeout)=> {
  let ses = sessions.find(s => s.id==sid)
  if (!ses) ses = await dbGetSes(sid)
  if (!ses) return false
  if (timeout) ses.timeout = timeout
  else delete ses.timeout
  return await dbUpdSes(ses) && true
}

var maxId = dbGetId()

loadSess()

setInterval(t, 1e6)

assign(global, {c, startSes, delSes, checkSes, labelSes, limitSes, sessions})