const mongoose = require('mongoose');

const watch_next_schema = new mongoose.Schema({
    _id : String,
    watchnext_struct : Array
}, { collection: 'tedx_data' });

module.exports = mongoose.model('watch_next_talk', watch_next_schema);