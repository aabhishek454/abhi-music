/* Abhi Music 3.0.3 bootloader */
(function(){
  var n=6, parts=[], i=0;
  function load(){
    if(i>=n){
      try {
        var s = atob(parts.join(""));
        var el = document.createElement("script");
        el.text = s;
        document.head.appendChild(el);
      } catch(e) { console.error("Abhi boot failed", e); }
      return;
    }
    fetch("/abhi-3.0.b64."+i+".txt").then(function(r){return r.text()}).then(function(t){
      parts[i++]=t; load();
    }).catch(function(e){ console.error(e); i++; load(); });
  }
  load();
})();
