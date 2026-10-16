(() => {
const board=window.BoardGameBoard,$=id=>document.getElementById(id);
const state={current:"P1",positions:{P1:1,P2:1},quizCorrect:0,duels:0,busy:false,lastEventId:null};
const quiz={question:"Candi Borobudur dikenal sebagai salah satu monumen Buddha terbesar di dunia. Bentuk bangunan utamanya secara umum tersusun atas bagian apa?",answers:["Kamadhatu, Rupadhatu, dan Arupadhatu","Garbhagriha, mandapa, dan gopuram","Alun-alun, pendopo, dan keraton","Stupa utama, menara lonceng, dan menara jam"],correct:0,explanation:"Borobudur memiliki tiga ranah simbolis: Kamadhatu (ranah nafsu), Rupadhatu (ranah berbentuk), dan Arupadhatu (ranah tanpa bentuk)."};
function setMessage(t){$("message").textContent=t}
function toast(t){const e=$("toast");e.textContent=t;e.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.classList.remove("show"),2600)}
function render(){
 const pos=state.positions[state.current],other=state.current==="P1"?"P2":"P1";
 $("currentPlayerName").textContent=state.current==="P1"?"Player 1":"Player 2";
 $("activeToken").textContent=state.current;
 $("currentPlayerPosition").textContent="Tile "+pos+" · "+board.zoneForTile(pos);
 $("p1Position").textContent="Tile "+state.positions.P1;
 $("p2Position").textContent="Tile "+state.positions.P2;
 $("playerChipP1").classList.toggle("active",state.current==="P1");
 $("playerChipP2").classList.toggle("active",state.current==="P2");
 $("statPosition").textContent=pos+" / "+board.TOTAL_TILES;
 $("statQuiz").textContent=state.quizCorrect;$("statDuels").textContent=state.duels;
 const pct=pos/board.TOTAL_TILES*100;$("progressText").textContent=pct.toFixed(1)+"%";$("progressBar").style.width=pct+"%";
 $("rollBtn").disabled=state.busy||pos>=board.TOTAL_TILES;
}
function switchTurn(){state.current=state.current==="P1"?"P2":"P1";render()}
function openModal(){$("quizModal").hidden=false}
function closeModal(){$("quizModal").hidden=true}
function resetModalStyle(){$("quizModal").classList.remove("minigame-modal");$("quizTitle").textContent="Borobudur Heritage Quiz"}
function checkAfterMove(id){
 if(state.positions[id]===board.TOTAL_TILES){$("diceStatus").textContent="EXPEDITION COMPLETE";setMessage((id==="P1"?"Player 1":"Player 2")+" reached the final tile!");toast("EXPEDITION COMPLETE — "+id+" wins!");return}
 const other=id==="P1"?"P2":"P1";
 if(state.positions[id]===state.positions[other]){setTimeout(openMinigame,220);return}
 if(state.positions[id]%31===0){setTimeout(openQuiz,220);return}
 if(state.positions[id]%37===0){setTimeout(openMinigame,220);return}
 switchTurn();
}
function roll(){
 if(state.busy)return;
 const n=Math.floor(Math.random()*6)+1,id=state.current,old=state.positions[id];
 $("diceFace")&&($("diceFace").textContent=["","⚀","⚁","⚂","⚃","⚄","⚅"][n]);
 $("diceStatus").textContent="DICE ROLLED · "+n;
 $("diceHint").textContent="Advancing from tile "+old+" to "+Math.min(board.TOTAL_TILES,old+n)+".";
 state.positions[id]=Math.min(board.TOTAL_TILES,old+n);board.setPosition(id,state.positions[id]);
 setMessage((id==="P1"?"Player 1":"Player 2")+" rolled "+n+". Moving along the expedition path.");
 render();checkAfterMove(id);
}
function openQuiz(){
 state.busy=true;render();$("quizContent").replaceChildren();$("quizTitle").textContent="Borobudur Heritage Quiz";
 const q=document.createElement("p");q.className="quiz-question";q.textContent=quiz.question;
 const options=document.createElement("div");options.className="quiz-options";
 quiz.answers.forEach((text,index)=>{
  const b=document.createElement("button");b.className="quiz-option";b.textContent=String.fromCharCode(65+index)+". "+text;
  b.addEventListener("click",()=>{
   if(options.dataset.answered)return;options.dataset.answered="1";[...options.querySelectorAll("button")].forEach(x=>x.disabled=true);
   const ok=index===quiz.correct,feedback=document.createElement("div");feedback.className="quiz-feedback "+(ok?"good":"bad");feedback.textContent=(ok?"Correct. ":"Not quite. ")+quiz.explanation;options.append(feedback);
   if(ok){state.quizCorrect++;state.positions[state.current]=Math.min(board.TOTAL_TILES,state.positions[state.current]+2);board.setPosition(state.current,state.positions[state.current]);setMessage("Correct answer — bonus movement: +2 tiles!")}
   else setMessage("Quiz answered. Read the explanation before continuing.");
   render();setTimeout(()=>{closeModal();state.busy=false;if(state.positions[state.current]>=board.TOTAL_TILES){render();return}switchTurn()},2600);
  });options.append(b);
 });
 $("quizContent").append(q,options);openModal();
}
function openMinigame(){
 state.busy=true;render();const opponent=state.current==="P1"?"P2":"P1",url=new URL("minigames/data-test.html",location.href);
 url.searchParams.set("player",state.current);url.searchParams.set("opponent",opponent);
 $("quizContent").replaceChildren();$("quizTitle").textContent="Jungle Reflex Duel";
 const p=document.createElement("p");p.className="muted";p.textContent="Complete the reflex challenge. The losing player moves back three tiles.";
 const frame=document.createElement("iframe");frame.src=url.href;frame.title="Mini-game data test";frame.className="minigame-frame";
 $("quizContent").append(p,frame);$("quizModal").classList.add("minigame-modal");openModal();
}
function finishMinigame(data){
 if(!data||data.type!=="MINIGAME_RESULT"||!data.eventId||state.lastEventId===data.eventId||!state.busy)return;
 if(!["P1","P2"].includes(data.winnerId)||!["P1","P2"].includes(data.loserId)||data.winnerId===data.loserId)return;
 state.lastEventId=data.eventId;state.duels++;
 const penalty=Math.max(0,Math.min(10,Number(data.penaltySteps)||0)),loser=data.loserId;
 state.positions[loser]=Math.max(1,state.positions[loser]-penalty);board.setPosition(loser,state.positions[loser]);
 closeModal();resetModalStyle();state.busy=false;
 $("diceStatus").textContent="DUEL COMPLETE · "+data.winnerId+" WON";
 setMessage(data.winnerId+" wins the duel. "+loser+" moves back "+penalty+" tiles.");
 toast(loser+" moves back "+penalty+" tiles.");switchTurn();
}
window.addEventListener("message",event=>{if(event.origin!==location.origin)return;finishMinigame(event.data)});
$("rollBtn").addEventListener("click",roll);
$("quizBtn").addEventListener("click",openQuiz);
$("minigameBtn").addEventListener("click",openMinigame);
$("resetBtn").addEventListener("click",()=>{
 state.current="P1";state.positions={P1:1,P2:1};state.quizCorrect=0;state.duels=0;state.busy=false;state.lastEventId=null;
 board.setPosition("P1",1);board.setPosition("P2",1);closeModal();resetModalStyle();
 $("diceStatus").textContent="EXPEDITION READY";$("diceHint").textContent="Drag to rotate · Scroll to zoom · Click a tile for information.";
 setMessage("Your journey begins here. Roll the dice to explore.");render();toast("Expedition reset.");
});
document.querySelectorAll("[data-close]").forEach(e=>e.addEventListener("click",()=>{closeModal();resetModalStyle();state.busy=false;render()}));
$("quizModal").addEventListener("click",e=>{if(e.target===$("quizModal")){closeModal();resetModalStyle();state.busy=false;render()}});
render();
})();