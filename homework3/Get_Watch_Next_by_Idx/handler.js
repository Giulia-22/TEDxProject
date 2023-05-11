const connect_to_db = require('./db');

// GET WATCH NEXT TALK BY ID

const watch_next_talk = require('./WatchNext');

module.exports.get_watch_next = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    console.log('Received event:', JSON.stringify(event, null, 2));
    let body = {}
    if (event.body) {
        body = JSON.parse(event.body)
    }
    // set default
    if(!body.id) {
        callback(null, {
                    statusCode: 500,
                    headers: { 'Content-Type': 'text/plain' },
                    body: 'Could not fetch the talks. Id is not correct.'
        })
    }
    
    connect_to_db().then(() => {
        console.log('=> get_all talks');
        var i = 0;
        var t = new Array();
        watch_next_talk.find({_id: body.id})
            .then(talks1 => {
                t = talks1[0].watchnext_struct;
                t.sort(confrontoPerPerc);
                    callback(null, {
                        statusCode: 200,
                        body: JSON.stringify(t)
                    })
                }
            )
            .catch(err =>
                callback(null, {
                    statusCode: err.statusCode || 404,
                    headers: { 'Content-Type': 'text/plain' },
                    body: 'Could not fetch the talks. Talk not found.'
                })
            );
    });
};
// Ordinamento talk per percentuale di gradimento decrescente 
function confrontoPerPerc(a, b) {
  if (a.gradimento < b.gradimento) {
    return 1;
  }
  if (a.gradimento > b.gradimento) {
    return -1;
  }
  return 0;
}
