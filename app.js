
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
//const date = require(__dirname + "/date.js");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));


main().catch(err => console.log(err));

async function main(){
  await mongoose.connect('mongodb+srv://syyed_muneer_ahmad:CPADNeCjOe3Qspte@cluster0.b57z4hq.mongodb.net/todolistDB');
};


  const itemSchema = new mongoose.Schema({
    name : {
      type:String,
      required : true
    }
  });
  const  Item = mongoose.model("Item",itemSchema);
  
  const item1 = new Item ({
    name : "Welcome to our ToDo-List!" 
  });
  
  
  const item2 = new Item ({
    name : "Hit + button to add a new item." 
  });
  
  
  const item3 = new Item ({
    name : "<-- Hit to delete a item." 
  });
  
  const listSchema = new mongoose.Schema({
    name:{
      type:String,
      required:true
    },
    items:[itemSchema]
  });

  const List = mongoose.model("List",listSchema);
  
  

app.get("/", async (req, res)=> {
  try{
 const itemArry = await Item.find({});
 if(itemArry.length === 0){
  await Item.insertMany([item1,item2,item3]);
  res.redirect("/");
}else{
  res.render("list", {listTitle: "Today", newListItems: itemArry});
}
 }
// const day = date.getDate(); => This code will give today's date we are not using it in this module as it's to understand DB
catch(err){
  res.send(err);
}
  
});


app.get("/:customListName",async function(req,res){
  const customListName = _.capitalize(req.params.customListName);

try {
 const foundList = await List.findOne({name:customListName}).exec();
 if(!foundList){
     
  const list = new List({
   name:customListName,
   items : [item1,item2,item3]
  });
  await list.save();
  res.redirect("/" + customListName);
 }
 else{
   res.render("list", {listTitle: foundList.name , newListItems: foundList.items});
 }
  }catch(err){
   res.send(ree);
 }

});


app.post("/", async function(req, res){

  const itemName = req.body.newItem;
  const listTitle = req.body.list;
  
  const newItem = new Item({
    name:itemName
  });

  if ( listTitle === "Today") {
    try{
     await newItem.save();
    res.redirect("/");
    }
    catch(err){
      res.send(err);
    }

  } else {
  try{
  const foundList = await List.findOne({name:listTitle}).exec();
  foundList.items.push(newItem);
  await foundList.save();
  res.redirect("/" + foundList.name);
  }
  catch(err){
    res.send(err);
  }
}
});

app.post("/delete" ,async function (req,res){

  // there is also a await Model.findByIdAndRemove(id) to delete a doc that matches the id note we don't need ({_id:id})

  const deletingItem = req.body.checkbox;
  const listName = req.body.listName;
  if(listName === "Today"){
  try{
    //await Item.deleteOne({_id:deletingItem});
    await Item.findByIdAndRemove(deletingItem);
    res.redirect("/");
  }catch(err){
    res.send(err);
  }
}
else{
  try{
  await List.findOneAndUpdate({name:listName},{$pull:{items:{_id:deletingItem}}});
  res.redirect("/"+listName);
}catch(err){
  console.log(err);
}
}
});

app.get("/about", function(req, res){
  res.render("about");
});


app.listen(3000, function() {
  console.log("Server started on port 3000");
});

