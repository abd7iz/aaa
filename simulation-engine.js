(function () {
  'use strict';

  var ENGINE = {};
  var FIELDS = ['physics', 'biology', 'chemistry', 'astronomy', 'mathematics'];
  var KEYS = /^[a-z][a-z0-9_]{0,19}$/;
  var TYPES = ['sphere', 'box', 'cylinder', 'torus', 'ring', 'cone', 'icosahedron'];
  var MOTIONS = ['none', 'orbit', 'rotate', 'pulse', 'swing', 'helix'];

  function finite(v, fallback) { return typeof v === 'number' && isFinite(v) ? v : fallback; }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function text(v, max, fallback) {
    return typeof v === 'string' ? v.trim().slice(0, max) : (fallback || '');
  }
  function vector(v, fallback, low, high) {
    if (!Array.isArray(v) || v.length !== 3) return fallback.slice();
    return v.map(function (n, i) { return clamp(finite(n, fallback[i]), low, high); });
  }
  function color(v, fallback) {
    return typeof v === 'string' && /^#?[0-9a-fA-F]{6}$/.test(v)
      ? (v.charAt(0) === '#' ? v : '#' + v) : fallback;
  }
  function makeControl(c, used) {
    if (!c || typeof c !== 'object' || !KEYS.test(c.key || '') || used[c.key]) return null;
    var min = finite(c.min, 0), max = finite(c.max, 1);
    if (max <= min || Math.abs(min) > 100000 || Math.abs(max) > 100000) return null;
    var step = clamp(finite(c.step, (max - min) / 100), 0.0001, max - min);
    var value = clamp(finite(c.value, (min + max) / 2), min, max);
    used[c.key] = true;
    return {
      key: c.key,
      label: text(c.label, 48, c.key),
      min: min, max: max, step: step, value: value,
      unit: text(c.unit, 18, ''),
      description: text(c.description, 120, '')
    };
  }
  function defaultControl(key, label, min, max, step, value, unit) {
    return { key: key, label: label, min: min, max: max, step: step, value: value, unit: unit, description: '' };
  }

  ENGINE.normalizeSpec = function (raw) {
    if (!raw || typeof raw !== 'object' || raw.schema !== 'mukhtabar-sim-v1') {
      throw new Error('صيغة التجربة التي أنشأها الذكاء الاصطناعي غير معروفة.');
    }
    var engine = ['tokamak', 'wave', 'pendulum', 'scene'].indexOf(raw.engine) >= 0 ? raw.engine : null;
    if (!engine) throw new Error('نوع المحاكاة غير مدعوم في محرك المختبر الحالي.');
    var field = FIELDS.indexOf(raw.field) >= 0 ? raw.field : 'physics';
    var used = {}, controls = [];
    (Array.isArray(raw.controls) ? raw.controls : []).slice(0, 7).forEach(function (c) {
      var item = makeControl(c, used);
      if (item) controls.push(item);
    });
    function ensure(c) {
      if (!used[c.key]) {
        var v = makeControl(c, used);
        if (v) controls.push(v);
      }
    }
    if (engine === 'tokamak') {
      ensure(defaultControl('field', 'شدة المجال المغناطيسي', 1, 12, .1, 6, 'T'));
      ensure(defaultControl('temperature', 'حرارة البلازما', 1, 20, .1, 8, 'keV'));
      ensure(defaultControl('density', 'كثافة البلازما', 1, 10, .1, 5, '×10¹⁹ م⁻³'));
    } else if (engine === 'wave') {
      ensure(defaultControl('amplitude', 'سعة الموجة', .2, 2.5, .05, 1, 'm'));
      ensure(defaultControl('frequency', 'التردد', .2, 4, .05, 1.2, 'Hz'));
      ensure(defaultControl('speed', 'سرعة الانتشار', .2, 5, .05, 2, 'm/s'));
    } else if (engine === 'pendulum') {
      ensure(defaultControl('length', 'طول الخيط', .5, 4, .05, 2, 'm'));
      ensure(defaultControl('gravity', 'تسارع الجاذبية', .5, 20, .05, 9.81, 'm/s²'));
      ensure(defaultControl('angle', 'زاوية البداية', 5, 80, 1, 35, '°'));
      ensure(defaultControl('damping', 'التخميد', 0, .8, .01, .04, ''));
    }
    if (!controls.length) controls.push(defaultControl('rate', 'معدل الحركة', .1, 3, .05, 1, '×'));
    if (controls.length > 7) controls = controls.slice(0, 7);

    var objects = [];
    (Array.isArray(raw.objects) ? raw.objects : []).slice(0, 18).forEach(function (o, i) {
      if (!o || TYPES.indexOf(o.type) < 0) return;
      var motion = o.motion && typeof o.motion === 'object' ? o.motion : {};
      var mt = MOTIONS.indexOf(motion.type) >= 0 ? motion.type : 'none';
      objects.push({
        id: 'object_' + i,
        type: o.type,
        label: text(o.label, 36, 'عنصر ' + (i + 1)),
        color: color(o.color, '#38bdf8'),
        emissive: color(o.emissive, '#000000'),
        position: vector(o.position, [0, 0, 0], -12, 12),
        scale: vector(o.scale, [1, 1, 1], .05, 5),
        rotation: vector(o.rotation, [0, 0, 0], -6.28, 6.28),
        motion: {
          type: mt,
          speed: clamp(finite(motion.speed, 1), -8, 8),
          radius: clamp(finite(motion.radius, 2), .1, 10),
          amplitude: clamp(finite(motion.amplitude, .5), 0, 3),
          axis: ['x', 'y', 'z'].indexOf(motion.axis) >= 0 ? motion.axis : 'y',
          control: KEYS.test(motion.control || '') ? motion.control : ''
        }
      });
    });
    if (engine === 'scene' && !objects.length) {
      objects = [
        { id: 'object_0', type: 'sphere', label: 'الجسم الرئيسي', color: '#38bdf8', emissive: '#12334b', position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0], motion: { type: 'pulse', speed: 1, radius: 2, amplitude: .12, axis: 'y', control: '' } },
        { id: 'object_1', type: 'torus', label: 'الحلقة', color: '#a78bfa', emissive: '#24134b', position: [0, 0, 0], scale: [2, 2, 2], rotation: [1.2, 0, 0], motion: { type: 'rotate', speed: .25, radius: 2, amplitude: .5, axis: 'y', control: '' } }
      ];
    }
    return {
      schema: 'mukhtabar-sim-v1',
      title: text(raw.title, 64, 'تجربة علمية جديدة') || 'تجربة علمية جديدة',
      field: field,
      engine: engine,
      summary: text(raw.summary, 180, 'محاكاة علمية تفاعلية ثلاثية الأبعاد.'),
      objective: text(raw.objective, 240, ''),
      principle: text(raw.principle, 600, ''),
      formula: text(raw.formula, 180, ''),
      assumptions: text(raw.assumptions, 300, ''),
      controls: controls,
      objects: objects
    };
  };

  function paramsFrom(def, state) {
    var out = {};
    def.params.forEach(function (p) {
      var n = state && state.params ? state.params[p.key] : NaN;
      out[p.key] = typeof n === 'number' && isFinite(n) ? clamp(n, p.min, p.max) : p.value;
    });
    return out;
  }
  function param(def, key, fallback) {
    return typeof def.params[key] === 'number' ? def.params[key] : fallback;
  }
  function safeInfo(s) { return String(s || '').replace(/[<>]/g, ''); }

  ENGINE.createDefinition = function (raw, makeStage, addLights) {
    var spec = ENGINE.normalizeSpec(raw);
    var def = {
      id: 'generated',
      field: spec.field === 'biology' ? 'bio' : 'phy',
      icon: spec.engine === 'tokamak' ? 'atom' : spec.engine === 'wave' ? 'activity' : spec.engine === 'pendulum' ? 'clock' : 'shapes',
      title: spec.title,
      short: spec.summary,
      spec: spec,
      params: spec.controls,
      explain: '<h3>هدف التجربة</h3><p>' + safeInfo(spec.objective || spec.summary) + '</p>' +
        '<h3>المبدأ العلمي</h3><p>' + safeInfo(spec.principle || 'هذا نموذج تفاعلي توضيحي. راقب تغير المشهد عند تعديل المتغيرات.') + '</p>' +
        (spec.formula ? '<h3>العلاقة الرياضية</h3><p><span class="eq">' + safeInfo(spec.formula) + '</span></p>' : '') +
        (spec.assumptions ? '<h3>حدود النموذج</h3><p>' + safeInfo(spec.assumptions) + '</p>' : '')
    };
    def.make = function (host, state) {
      var T = window.THREE, prm = paramsFrom(def, state), time = 0, playing = true;
      var st = makeStage(host, { dist: spec.engine === 'tokamak' ? 14 : 10, th: .55, ph: 1.15, fitW: spec.engine === 'tokamak' ? 6.5 : 5.5, minR: 3, maxR: 50, update: tick });
      var S = st.scene;
      addLights(S, true);
      var disposers = [];
      var readout = function () {
        return Object.keys(prm).map(function (k) {
          var c = def.params.filter(function (p) { return p.key === k; })[0];
          return [c ? c.label : k, prm[k].toFixed(2) + (c && c.unit ? ' ' + c.unit : '')];
        });
      };
      var actions = function () {
        return [
          { icon: playing ? 'pause' : 'play', label: playing ? 'إيقاف' : 'تشغيل', primary: true, fn: function () { playing = !playing; } },
          { icon: 'rotate-ccw', label: 'إعادة', fn: function () { reset(); } },
          { icon: 'eye', label: 'توسيط المشهد', fn: function () { st.target.set(0, 0, 0); st.sph.r = spec.engine === 'tokamak' ? 14 : 10; st.place(); } }
        ];
      };
      function reset() { time = 0; if (typeof resetModel === 'function') resetModel(); }
      function tick(dt) {
        if (playing) {
          time += Math.min(dt, .04) * Math.max(.05, param(prm, 'rate', param(prm, 'speed', 1)));
          updateModel(dt);
        }
      }
      var updateModel = function () {};
      var resetModel = function () {};

      if (spec.engine === 'tokamak') {
        var R = 2.8, tube = .58;
        var vessel = new T.Mesh(new T.TorusGeometry(R, tube * 1.28, 24, 100), new T.MeshPhongMaterial({ color: 0x64748b, transparent: true, opacity: .22, shininess: 95, side: T.DoubleSide }));
        S.add(vessel);
        var plasmaMat = new T.MeshPhongMaterial({ color: 0x38bdf8, emissive: 0x082e59, emissiveIntensity: 1.1, transparent: true, opacity: .82, shininess: 100, side: T.DoubleSide });
        var plasma = new T.Mesh(new T.TorusGeometry(R, tube, 32, 120), plasmaMat);
        plasma.rotation.x = .12; S.add(plasma);
        var inner = new T.Mesh(new T.TorusGeometry(R, tube * .72, 18, 100), new T.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: .18 }));
        inner.rotation.x = .12; S.add(inner);
        var core = new T.Mesh(new T.CylinderGeometry(.42, .42, 2.8, 32), new T.MeshPhongMaterial({ color: 0x334155, metalness: .7, shininess: 90 }));
        core.rotation.x = Math.PI / 2; S.add(core);
        for (var c = 0; c < 14; c++) {
          var a = c / 14 * Math.PI * 2;
          var coil = new T.Mesh(new T.TorusGeometry(.72, .09, 12, 32), new T.MeshPhongMaterial({ color: 0xd5a85c, metalness: .8, shininess: 100 }));
          coil.position.set(Math.cos(a) * R, 0, Math.sin(a) * R);
          coil.rotation.y = -a; coil.rotation.x = Math.PI / 2; S.add(coil);
        }
        var lineGroup = new T.Group(); S.add(lineGroup);
        var lineMats = [];
        for (var f = 0; f < 9; f++) {
          var points = [], phase = f * Math.PI * 2 / 9;
          for (var j = 0; j <= 360; j++) {
            var u = j / 360 * Math.PI * 4, twist = 2.3 + param(prm, 'field', 6) * .19;
            var v = twist * u + phase;
            points.push(new T.Vector3((R + tube * Math.cos(v)) * Math.cos(u), tube * Math.sin(v), (R + tube * Math.cos(v)) * Math.sin(u)));
          }
          var curve = new T.CatmullRomCurve3(points);
          var line = new T.Mesh(new T.TubeGeometry(curve, 420, .018, 5, false), new T.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: .48 }));
          lineGroup.add(line); lineMats.push(line.material);
        }
        var count = 900, arr = new Float32Array(count * 3), pg = new T.BufferGeometry();
        pg.setAttribute('position', new T.BufferAttribute(arr, 3));
        var dots = new T.Points(pg, new T.PointsMaterial({ color: 0xfef3c7, size: .055, transparent: true, opacity: .95, sizeAttenuation: true }));
        S.add(dots);
        var glow = new T.PointLight(0x38bdf8, 1.8, 14); glow.position.set(0, 1.2, 0); S.add(glow);
        updateModel = function (dt) {
          var B = param(prm, 'field', 6), heat = param(prm, 'temperature', 8), density = param(prm, 'density', 5);
          var hue = clamp(.56 - (heat - 1) / 19 * .12, .42, .58);
          plasmaMat.color.setHSL(hue, .92, .56);
          plasmaMat.emissive.setHSL(hue, .9, .16);
          plasmaMat.emissiveIntensity = .55 + heat / 20 * 1.8;
          glow.intensity = .7 + heat / 20 * 2.2;
          lineMats.forEach(function (m) { m.opacity = .18 + B / 12 * .58; });
          var visible = Math.floor(count * density / 10), rate = .35 + heat / 20 * 2.6;
          for (var n = 0; n < visible; n++) {
            var u = ((n / visible) * Math.PI * 2 + time * rate) % (Math.PI * 2);
            var v = 2.3 * u + (B * .19) * u + n * 2.399;
            arr[n * 3] = (R + tube * Math.cos(v)) * Math.cos(u);
            arr[n * 3 + 1] = tube * Math.sin(v);
            arr[n * 3 + 2] = (R + tube * Math.cos(v)) * Math.sin(u);
          }
          pg.attributes.position.needsUpdate = true; pg.setDrawRange(0, visible);
        };
        resetModel = function () { time = 0; updateModel(0); };
        updateModel(0);
        st.sph.r = 14; st.place();
      } else if (spec.engine === 'wave') {
        var length = 12, N = 260, data = new Float32Array((N + 1) * 3), geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(data, 3));
        var wave = new T.Line(geo, new T.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 }));
        S.add(wave);
        var axisGeo = new T.BufferGeometry().setFromPoints([new T.Vector3(-6, 0, 0), new T.Vector3(6, 0, 0)]);
        S.add(new T.Line(axisGeo, new T.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: .45 })));
        var bob = new T.Mesh(new T.SphereGeometry(.15, 22, 16), new T.MeshPhongMaterial({ color: 0xfbbf24, emissive: 0x7c4a03, emissiveIntensity: .45 }));
        S.add(bob);
        var markers = [];
        for (var m = 0; m < 9; m++) {
          var marker = new T.Mesh(new T.SphereGeometry(.045, 10, 8), new T.MeshBasicMaterial({ color: 0x94a3b8 }));
          marker.position.x = -5.5 + m * 1.35; S.add(marker); markers.push(marker);
        }
        updateModel = function () {
          var A = param(prm, 'amplitude', 1), freq = param(prm, 'frequency', 1.2), speed = param(prm, 'speed', 2);
          var phase = time * freq * Math.PI * 2;
          for (var q = 0; q <= N; q++) {
            var x = -length / 2 + length * q / N;
            data[q * 3] = x;
            data[q * 3 + 1] = A * Math.sin(x * Math.PI * 1.15 - phase);
            data[q * 3 + 2] = 0;
          }
          geo.attributes.position.needsUpdate = true;
          var bx = -6 + ((time * speed) % length);
          bob.position.set(bx, A * Math.sin(bx * Math.PI * 1.15 - phase), .18);
          markers.forEach(function (mk, i) {
            mk.position.y = A * Math.sin(mk.position.x * Math.PI * 1.15 - phase);
          });
        };
        resetModel = function () { time = 0; updateModel(0); };
        updateModel(0);
      } else if (spec.engine === 'pendulum') {
        var L = param(prm, 'length', 2), pivot = new T.Vector3(0, 3, 0);
        var pivotMesh = new T.Mesh(new T.SphereGeometry(.13, 18, 12), new T.MeshPhongMaterial({ color: 0xd1d5db }));
        pivotMesh.position.copy(pivot); S.add(pivotMesh);
        var rod = new T.Mesh(new T.CylinderGeometry(.035, .035, 1, 12), new T.MeshPhongMaterial({ color: 0x94a3b8, metalness: .5 }));
        S.add(rod);
        var bobMesh = new T.Mesh(new T.SphereGeometry(.28, 32, 24), new T.MeshPhongMaterial({ color: 0xfb923c, emissive: 0x7c2d12, emissiveIntensity: .35, shininess: 80 }));
        S.add(bobMesh);
        var trailPositions = new Float32Array(450 * 3), trailGeo = new T.BufferGeometry();
        trailGeo.setAttribute('position', new T.BufferAttribute(trailPositions, 3));
        trailGeo.setDrawRange(0, 0);
        S.add(new T.Line(trailGeo, new T.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: .7 })));
        var theta = param(prm, 'angle', 35) * Math.PI / 180, omega = 0, trailCount = 0, accTime = 0;
        function pendulumPosition() {
          var len = param(prm, 'length', 2);
          return new T.Vector3(pivot.x + len * Math.sin(theta), pivot.y - len * Math.cos(theta), 0);
        }
        function drawPendulum() {
          L = param(prm, 'length', 2);
          var p = pendulumPosition();
          rod.position.copy(pivot).add(p).multiplyScalar(.5);
          rod.scale.y = p.distanceTo(pivot);
          rod.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), p.clone().sub(pivot).normalize());
          bobMesh.position.copy(p);
          if (trailCount < 450) {
            trailPositions[trailCount * 3] = p.x; trailPositions[trailCount * 3 + 1] = p.y; trailPositions[trailCount * 3 + 2] = p.z;
            trailCount++; trailGeo.attributes.position.needsUpdate = true; trailGeo.setDrawRange(0, trailCount);
          } else {
            trailPositions.copyWithin(0, 3);
            trailPositions[447] = p.x; trailPositions[448] = p.y; trailPositions[449] = p.z;
            trailGeo.attributes.position.needsUpdate = true;
          }
        }
        updateModel = function (dt) {
          var remain = Math.min(dt, .05), step = .005, guard = 0;
          while (remain > 0 && guard++ < 20) {
            var h = Math.min(step, remain), g = param(prm, 'gravity', 9.81), damp = param(prm, 'damping', .04);
            var accel = -(g / L) * Math.sin(theta) - damp * omega;
            omega += accel * h; theta += omega * h; remain -= h;
          }
          drawPendulum();
        };
        resetModel = function () {
          theta = param(prm, 'angle', 35) * Math.PI / 180; omega = 0; trailCount = 0;
          trailGeo.setDrawRange(0, 0); drawPendulum();
        };
        resetModel();
      } else {
        var meshes = [];
        spec.objects.forEach(function (o) {
          var g;
          if (o.type === 'sphere') g = new T.SphereGeometry(.5, 32, 24);
          else if (o.type === 'box') g = new T.BoxGeometry(1, 1, 1);
          else if (o.type === 'cylinder') g = new T.CylinderGeometry(.5, .5, 1, 32);
          else if (o.type === 'torus') g = new T.TorusGeometry(.7, .18, 18, 64);
          else if (o.type === 'ring') g = new T.RingGeometry(.4, .7, 64);
          else if (o.type === 'cone') g = new T.ConeGeometry(.5, 1, 32);
          else g = new T.IcosahedronGeometry(.55, 2);
          var mat = new T.MeshPhongMaterial({ color: o.color, emissive: o.emissive, shininess: 80, transparent: true, opacity: .95, side: T.DoubleSide });
          var mesh = new T.Mesh(g, mat);
          mesh.position.fromArray(o.position); mesh.scale.set(o.scale[0], o.scale[1], o.scale[2]); mesh.rotation.set(o.rotation[0], o.rotation[1], o.rotation[2]);
          S.add(mesh); meshes.push({ mesh: mesh, config: o, base: mesh.position.clone(), scale: mesh.scale.clone(), rot: mesh.rotation.clone() });
        });
        updateModel = function () {
          meshes.forEach(function (entry, i) {
            var o = entry.config, m = o.motion, mesh = entry.mesh, v = m.speed;
            if (m.control && typeof prm[m.control] === 'number') v *= prm[m.control];
            var a = time * v + i * .7;
            if (m.type === 'rotate') {
              mesh.rotation[m.axis] = entry.rot[m.axis] + a;
            } else if (m.type === 'orbit') {
              var r = m.radius;
              if (m.axis === 'x') { mesh.position.y = entry.base.y + Math.cos(a) * r; mesh.position.z = entry.base.z + Math.sin(a) * r; }
              else if (m.axis === 'z') { mesh.position.x = entry.base.x + Math.cos(a) * r; mesh.position.y = entry.base.y + Math.sin(a) * r; }
              else { mesh.position.x = entry.base.x + Math.cos(a) * r; mesh.position.z = entry.base.z + Math.sin(a) * r; }
            } else if (m.type === 'pulse') {
              var k = 1 + Math.sin(a) * m.amplitude * .25;
              mesh.scale.copy(entry.scale).multiplyScalar(k);
            } else if (m.type === 'swing') {
              mesh.rotation.z = entry.rot.z + Math.sin(a) * m.amplitude;
            } else if (m.type === 'helix') {
              mesh.position.x = entry.base.x + Math.cos(a) * m.radius;
              mesh.position.y = entry.base.y + Math.sin(a * 1.7) * m.amplitude;
              mesh.position.z = entry.base.z + Math.sin(a) * m.radius;
            }
          });
        };
        resetModel = function () {
          meshes.forEach(function (entry) {
            entry.mesh.position.copy(entry.base); entry.mesh.scale.copy(entry.scale); entry.mesh.rotation.copy(entry.rot);
          });
          updateModel(0);
        };
        updateModel(0);
      }

      var lastValues = '';
      return {
        params: prm,
        setParam: function (key, value) { prm[key] = value; if (spec.engine === 'pendulum') resetModel(); else updateModel(0); },
        getState: function () { return { params: Object.assign({}, prm), spec: spec }; },
        actions: actions,
        readouts: readout,
        info: function () {
          if (spec.engine === 'tokamak') return 'نموذج توضيحي لشكل البلازما وخطوط المجال وحركة جسيمات مشحونة. لا يحل معادلات MHD ولا يتنبأ باستقرار مفاعل حقيقي.';
          if (spec.engine === 'pendulum') return 'يتحرك الثقل وفق معادلة البندول مع تكامل عددي مبسط وتخميد اختياري. النموذج ثنائي الأبعاد داخل مشهد ثلاثي الأبعاد.';
          if (spec.engine === 'wave') return 'يمثل الخط موجة جيبية مثالية. غيّر السعة والتردد وسرعة الانتشار ولاحظ تغير شكل الموجة وطورها.';
          return spec.assumptions || spec.principle || spec.summary;
        },
        dispose: function () { st.dispose(); }
      };
    };
    return def;
  };

  window.MUKHTABAR_ENGINE = ENGINE;
})();