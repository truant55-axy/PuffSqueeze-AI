// PuffSqueeze's two-direction adaptation. Completed runs are reported to its parent page.
var flightInput = { left: false, right: false };
var flightDirectInput = { left: false, right: false };
var flightGripInput = { left: false, right: false };
var flightGripNeedsNeutral = true;
var flightHeight = 100;
var flightChord = false;
var flightLanguage = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'zh';
var flightOverlay = 'ready';
var flightCopy = {
  zh: {
    tagline:'把节奏，交给海风。', distance:'航程', level:'旅程', collected:'收集', energy:'飞行能量',
    pause:'暂停', resume:'继续', rise:'上升', descend:'下降', hold:'短按一次移动一段 · 长按不连发',
    both:'双键一起按暂停 · 松开后按任一键继续',
    ready:['沿着海风，轻轻出发','小飞机会自动前行。收集青绿色能量，轻轻避开珊瑚红障碍。','开始飞行','按任一方向键开始，无需空格键。'],
    paused:['在这里，歇一小会儿','海风会等你，旅程已暂停。','继续飞行','松开双键，再按任一方向键继续。'],
    finished:['这一程，辛苦啦','已飞行 {distance} 米，收集了 {collected} 份能量。准备好了，就再出发。','重新出发','按任一方向键重新出发。'],
    error:['暂时无法开启飞行','此游戏需要浏览器支持 WebGL。请开启浏览器图形加速后刷新页面。','暂不可用','可以使用左上角返回游戏页。'],
    world:'海面、云朵与小飞机', progress:'飞行进度', riseLabel:'短按上方向键，上升一段', descendLabel:'短按下方向键，下降一段'
  },
  en: {
    tagline:'Let the sea breeze set the pace.', distance:'Distance', level:'Journey', collected:'Collected', energy:'Flight energy',
    pause:'Pause', resume:'Resume', rise:'Rise', descend:'Descend', hold:'Tap once to move one step · Hold does not repeat',
    both:'Press both to pause · Release, then press either to resume',
    ready:['A little flight, a little calm','Fly forward automatically. Collect teal energy and gently steer clear of coral obstacles.','Begin flight','Press either arrow to begin. No space bar needed.'],
    paused:['Take a little breather','Your journey is paused. The sea breeze can wait.','Continue flight','Release both arrows, then press either one to continue.'],
    finished:['A lovely little journey','You flew {distance} m and collected {collected} energy drops. Set off again whenever you feel ready.','Fly again','Press either arrow to set off again.'],
    error:['Flight is unavailable','This game needs WebGL. Enable browser graphics acceleration, then refresh the page.','Unavailable','Use the top-left arrow to return to games.'],
    world:'Sea, clouds and a little airplane', progress:'Flight progress', riseLabel:'Tap up arrow to rise one step', descendLabel:'Tap down arrow to descend one step'
  }
};

function clearFlightObjects(){
  if(typeof coinsHolder!=='undefined'){
    while(coinsHolder.coinsInUse.length){ var coin=coinsHolder.coinsInUse.pop(); coinsHolder.mesh.remove(coin.mesh); coinsHolder.coinsPool.push(coin); }
  }
  if(typeof ennemiesHolder!=='undefined'){
    while(ennemiesHolder.ennemiesInUse.length){ var obstacle=ennemiesHolder.ennemiesInUse.pop(); ennemiesHolder.mesh.remove(obstacle.mesh); ennemiesPool.push(obstacle); }
  }
  while(particlesInUse.length){ var particle=particlesInUse.pop(); if(particle.mesh.parent) particle.mesh.parent.remove(particle.mesh); particlesPool.push(particle); }
}

function setFlightOverlay(mode){
  if(mode==='finished' && flightOverlay!=='finished' && window.parent!==window && typeof game!=='undefined' && game){
    window.parent.postMessage({type:'puffsqueeze:aviator-result', distance:Math.floor(game.distance), collected:game.collected, level:game.level}, window.location.origin);
  }
  flightOverlay=mode;
  var overlay=document.getElementById('replayMessage');
  overlay.hidden=!mode;
  if(mode){
    var copy=flightCopy[flightLanguage][mode];
    document.getElementById('overlayTitle').textContent=copy[0];
    document.getElementById('overlayBody').textContent=copy[1]
      .replace('{distance}',typeof game!=='undefined'&&game?Math.floor(game.distance):0)
      .replace('{collected}',typeof game!=='undefined'&&game?game.collected:0);
    document.getElementById('startButton').textContent=copy[2];
    document.getElementById('startButton').disabled=mode==='error';
    document.getElementById('overlayHint').textContent=copy[3];
  }
  var pause=document.getElementById('pauseButton');
  pause.textContent=flightCopy[flightLanguage][mode==='paused'?'resume':'pause'];
  pause.disabled=mode==='ready'||mode==='finished'||mode==='error';
}

function setFlightLanguage(language){
  flightLanguage=language==='en'?'en':'zh';
  document.documentElement.lang=flightLanguage==='en'?'en':'zh-CN';
  document.querySelectorAll('[data-i18n]').forEach(function(node){node.textContent=flightCopy[flightLanguage][node.dataset.i18n];});
  document.getElementById('world').setAttribute('aria-label',flightCopy[flightLanguage].world);
  document.querySelector('.flight-hud').setAttribute('aria-label',flightCopy[flightLanguage].progress);
  document.getElementById('energyMeter').setAttribute('aria-label',flightCopy[flightLanguage].energy);
  document.getElementById('riseButton').setAttribute('aria-label',flightCopy[flightLanguage].riseLabel);
  document.getElementById('descendButton').setAttribute('aria-label',flightCopy[flightLanguage].descendLabel);
  setFlightOverlay(flightOverlay);
}

function updateFlightHud(){
  document.getElementById('collectedValue').textContent=game.collected;
  document.getElementById('energyMeter').setAttribute('aria-valuenow',Math.round(game.energy));
}

function beginFlight(){
  if(!game||flightOverlay==='error') return;
  if(game.status==='ready'||game.status==='waitingReplay'){
    resetGame();
    energyBar.style.right='0%';
    energyBar.style.backgroundColor='#68c3c0';
    fieldDistance.textContent='0';
    updateFlightHud();
  }else if(game.status==='paused'){
    game.status='playing';
  }else return;
  oldTime=Date.now();
  setFlightOverlay(null);
}

function pauseFlight(){
  if(!game||game.status!=='playing') return;
  game.status='paused';
  flightInput.left=flightInput.right=false;
  updateInputDisplay();
  setFlightOverlay('paused');
}

function updateInputDisplay(){
  document.getElementById('riseButton').setAttribute('aria-pressed',String(flightInput.left));
  document.getElementById('descendButton').setAttribute('aria-pressed',String(flightInput.right));
}

function applyFlightInput(key,down,repeat){
  if(!game||flightOverlay==='error') return;
  var name=key==='ArrowLeft'?'left':key==='ArrowRight'?'right':null;
  if(!name) return;
  var wasDown=flightInput[name];
  flightInput[name]=down;
  if(!flightInput.left&&!flightInput.right) flightChord=false;
  if(down&&!repeat&&!wasDown){
    if(flightInput.left&&flightInput.right){
      flightChord=true;
      pauseFlight();
      // Keep the chord latched until keyup arrives, so holding cannot resume.
      flightInput.left=flightInput.right=true;
    }else if(!flightChord){
      beginFlight();
      if(game.status==='playing'){
        // Only a fresh press changes the target; held frames and key repeats do not.
        flightHeight=Math.max(game.planeDefaultHeight-game.planeAmpHeight,
          Math.min(game.planeDefaultHeight+game.planeAmpHeight,
            flightHeight+(name==='left'?1:-1)*game.planeTapHeight));
      }
    }
  }
  updateInputDisplay();
}

function updateFlightSources(repeat){
  var next={left:flightDirectInput.left||flightGripInput.left,right:flightDirectInput.right||flightGripInput.right};
  if(next.left&&next.right&&!flightChord){
    // A simultaneous two-control frame pauses without first adding an up step.
    flightChord=true;
    pauseFlight();
    flightInput.left=flightInput.right=true;
    updateInputDisplay();
    return;
  }
  // Apply releases before presses: swapping hands cannot form a false pause chord.
  ['left','right'].forEach(function(side){
    if(flightInput[side]&&!next[side]) applyFlightInput(side==='left'?'ArrowLeft':'ArrowRight',false,false);
  });
  ['left','right'].forEach(function(side){
    if(next[side]&&!flightInput[side]) applyFlightInput(side==='left'?'ArrowLeft':'ArrowRight',true,repeat);
  });
}

function handleFlightInput(key,down,repeat){
  var side=key==='ArrowLeft'||key==='ArrowUp'?'left':key==='ArrowRight'||key==='ArrowDown'?'right':null;
  if(!side) return;
  flightDirectInput[side]=down;
  updateFlightSources(repeat);
}

function handleFlightGrip(left,right){
  if(![left,right].every(function(value){return typeof value==='number'&&isFinite(value)&&value>=0&&value<=1;})) return;
  if(flightGripNeedsNeutral){
    if(left!==0||right!==0) return;
    flightGripNeedsNeutral=false;
  }
  flightGripInput.left=left>=.18;
  flightGripInput.right=right>=.18;
  updateFlightSources(false);
}

function releaseFlightInput(){
  flightInput.left=flightInput.right=false;
  flightDirectInput.left=flightDirectInput.right=false;
  flightGripInput.left=flightGripInput.right=false;
  flightGripNeedsNeutral=true;
  flightChord=false;
  updateInputDisplay();
}

function initFlightControls(){
  setFlightLanguage(flightLanguage);
  ['keydown','keyup'].forEach(function(type){
    window.addEventListener(type,function(event){
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].indexOf(event.key)===-1) return;
      if(event.altKey||event.ctrlKey||event.metaKey) return;
      event.preventDefault();
      handleFlightInput(event.key,type==='keydown',event.repeat);
    });
  });
  window.addEventListener('message',function(event){
    if(event.source!==window.parent||event.origin!==location.origin||!event.data) return;
    if(event.data.type==='puffsqueeze:aviator-input'&&typeof event.data.down==='boolean'){
      handleFlightInput(event.data.key,event.data.down,Boolean(event.data.repeat));
    }else if(event.data.type==='puffsqueeze:aviator-grip'){
      handleFlightGrip(event.data.left,event.data.right);
    }else if(event.data.type==='puffsqueeze:aviator-language'){
      setFlightLanguage(event.data.language);
    }else if(event.data.type==='puffsqueeze:aviator-suspend'){
      releaseFlightInput();
      pauseFlight();
    }
  });
  window.addEventListener('blur',function(){releaseFlightInput();pauseFlight();});
  document.addEventListener('visibilitychange',function(){if(document.hidden){releaseFlightInput();pauseFlight();}});
  document.getElementById('startButton').addEventListener('click',function(){releaseFlightInput();beginFlight();});
  document.getElementById('pauseButton').addEventListener('click',function(){
    releaseFlightInput();
    if(game.status==='paused') beginFlight(); else pauseFlight();
  });
  [['riseButton','ArrowLeft'],['descendButton','ArrowRight']].forEach(function(pair){
    var button=document.getElementById(pair[0]);
    button.addEventListener('pointerdown',function(event){
      if(event.button!==0) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      handleFlightInput(pair[1],true,false);
    });
    ['pointerup','pointercancel','lostpointercapture'].forEach(function(type){
      button.addEventListener(type,function(){handleFlightInput(pair[1],false,false);});
    });
    // Native Enter/Space activation remains available for assistive technology.
    button.addEventListener('click',function(event){
      if(event.detail!==0) return;
      handleFlightInput(pair[1],true,false);
      setTimeout(function(){handleFlightInput(pair[1],false,false);},180);
    });
  });
  renderer.domElement.addEventListener('webglcontextlost',function(event){
    event.preventDefault();
    game.status='paused';
    releaseFlightInput();
    setFlightOverlay('error');
  });
}
