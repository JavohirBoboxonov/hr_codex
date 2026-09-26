const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/hrlodex').then(async () => {
  const Job = mongoose.model('Job', new mongoose.Schema({}, { strict: false }));
  const jobs = await Job.find().sort({createdAt: -1}).limit(1);
  console.log(jobs);
  mongoose.disconnect();
});
