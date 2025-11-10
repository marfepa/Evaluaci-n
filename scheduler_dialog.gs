<!DOCTYPE html>
<html><head><base target="_top">
<style>body{font-family:Arial;padding:12px}label{display:block;margin:6px 0}</style>
</head><body>
<h3>Nueva programación</h3>
<form id="f">
  <label> Frecuencia:
    <select name="freq">
      <option>Diario</option><option>Semanal</option>
      <option>Quincenal</option><option>Mensual</option>
    </select>
  </label>
  <label> Hora (0-23): <input type="number" name="hora" value="18" min="0" max="23"></label>
  <label> Minuto:      <input type="number" name="min"  value="0"  min="0" max="59"></label>
  <fieldset><legend>Días permitidos (vacío = todos)</legend>
    <label><input type="checkbox" name="dia" value="1" checked> L</label>
    <label><input type="checkbox" name="dia" value="2" checked> M</label>
    <label><input type="checkbox" name="dia" value="3" checked> X</label>
    <label><input type="checkbox" name="dia" value="4" checked> J</label>
    <label><input type="checkbox" name="dia" value="5" checked> V</label>
    <label><input type="checkbox" name="dia" value="6"> S</label>
    <label><input type="checkbox" name="dia" value="0"> D</label>
  </fieldset><br>
  <button type="button" onclick="save()">Guardar & activar</button>
</form>
<script>
function save(){
  const fd=new FormData(document.getElementById('f'));
  const dias=[...fd.entries()]
             .filter(e=>e[0]==='dia')          // checkboxes
             .map(e=>Number(e[1]));
  const data={freq:fd.get('freq'),hora:fd.get('hora'),
              min:fd.get('min'),dias:dias};
  google.script.run
    .withSuccessHandler(()=>google.script.host.close())
    .saveSchedule(data);
}
</script>
</body></html>