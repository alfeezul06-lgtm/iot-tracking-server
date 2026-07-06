// Example Express endpoint for warehouse updates
app.post('/stock',(req,res)=>{
 const {name,action,quantity}=req.body;
 // TODO: update database
 res.json({success:true});
});
