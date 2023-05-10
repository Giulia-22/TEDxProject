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
    
    if (!body.doc_per_page) {
        body.doc_per_page = 10
    }
    if (!body.page) {
        body.page = 1
    }
    
    connect_to_db().then(() => {
        console.log('=> get_all talks');
        var i = 0;
        var t = new Array();
        watch_next_talk.find({_id: body.id})
            .then(talks1 => {
                for(i=0;i<6;i++)
                {
                    t[i] = {
                        "wn_id" : talks1[0].watchnext_struct[i].watch_next_idx_watchnext,
                        "wn_url" : talks1[0].watchnext_struct[i].url_watchnext,
                        "wn_gradimento" : talks1[0].watchnext_struct[i].gradimento // da mod con array
                    }
                }
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
  if (a.wn_gradimento < b.wn_gradimento) {
    return 1;
  }
  if (a.wn_gradimento > b.wn_gradimento) {
    return -1;
  }
  return 0;
}