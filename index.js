{
  var c = console.log, { assign } = Object

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

const

rndStr = (i=4, f=()=>Math.random().toString(36).slice(2), s='') =>
  { for (;i;--i) s+=f(); return s },

db = {
  sess: [],
  users: [{id: 17, pass: 'qwerty'}, {id: 32, pass: 'box'}]
}

t()
for (let i=0; i<1e6; ++i) rndStr()
t()

setInterval(t, 1e6)

assign(global, {rndStr})