<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body{font-family:Arial,sans-serif;padding:10px}
    label{display:block;margin-top:8px}
    button{margin-top:15px;padding:6px 14px}
  </style>
</head>
<body>
  <h3>Reporte avanzado de asistencia</h3>

  <label>Curso (nombre exacto):
    <input type="text" id="curso" required>
  </label>

  <label>Desde:
    <input type="date" id="desde" required>
  </label>

  <label>Hasta:
    <input type="date" id="hasta" required>
  </label>

  <button onclick="enviar()">Generar</button>

  <script>
    function enviar(){
      const curso = document.getElementById('curso').value.trim();
      const d     = document.getElementById('desde').value;
      const h     = document.getElementById('hasta').value;
      if(!curso||!d||!h){ alert('Completa todos los campos'); return; }

      google.script.run
        .withSuccessHandler(()=>google.script.host.close())
        .reporteAsistenciaAvanzada_core(curso,d,h);
    }
  </script>
</body>
</html>