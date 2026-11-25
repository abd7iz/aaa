(function () {
  'use strict';

  var ENGINE = {};
  var FIELDS = ['physics', 'biology', 'chemistry', 'astronomy', 'mathematics'];
  var KEYS = /^[a-z][a-z0-9_]{0,19}$/;
  var TYPES = ['sphere', 'box', 'cylinder', 'torus', 'ring', 'cone', 'icosahedron'];
  var MOTIONS = ['none', 'orbit', 'rotate', 'pulse', 'swing', 'helix'];

  function finite(v, fallback) { return typeof v === 'number' && isFinite(v) ? v : fallback; }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  // Deterministic pseudo-random generator used to distribute tokamak particles.
  function seeded(seed) {
    var state = seed;
    return function () {
      state = (state * 16807) % 2147483647;
      return state / 2147483647 * 2 - 1;
    };
  }
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
    var engine = ['tokamak', 'wave', 'pendulum', 'interference', 'induction', 'diffraction', 'dipole', 'scene'].indexOf(raw.engine) >= 0 ? raw.engine : null;
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
    } else if (engine === 'interference') {
      ensure(defaultControl('wavelength', 'الطول الموجي للضوء', 380, 700, 5, 550, 'nm'));
      ensure(defaultControl('separation', 'المسافة بين الشقين', .1, .6, .01, .25, 'mm'));
      ensure(defaultControl('distance', 'بعد الشاشة', .5, 2.5, .05, 1.5, 'm'));
    } else if (engine === 'induction') {
      ensure(defaultControl('field', 'شدة المجال المغناطيسي', .1, 2, .05, .8, 'T'));
      ensure(defaultControl('area', 'مساحة الملف', .01, .1, .005, .04, 'm²'));
      ensure(defaultControl('turns', 'عدد لفات الملف', 10, 200, 5, 100, 'لفة'));
      ensure(defaultControl('angular_speed', 'السرعة الزاوية', 1, 30, .5, 12, 'rad/s'));
      ensure(defaultControl('resistance', 'مقاومة الدائرة', .5, 20, .5, 4, 'Ω'));
    } else if (engine === 'diffraction') {
      ensure(defaultControl('wavelength', 'الطول الموجي', 380, 700, 5, 550, 'nm'));
      ensure(defaultControl('grating_spacing', 'المسافة بين الشقوق', 2, 10, .1, 5, 'μm'));
      ensure(defaultControl('slit_count', 'عدد الشقوق', 2, 8, 1, 5, 'شق'));
      ensure(defaultControl('slit_width', 'عرض الشق', .1, .8, .05, .35, 'μm'));
      ensure(defaultControl('distance', 'بعد الشاشة', .5, 2.5, .05, 1.5, 'm'));
    } else if (engine === 'dipole') {
      ensure(defaultControl('moment', 'العزم المغناطيسي', .5, 5, .1, 2, 'A·m²'));
      ensure(defaultControl('probe_radius', 'بعد المجس عن المركز', .6, 2.5, .05, 1.3, 'm'));
      ensure(defaultControl('probe_angle', 'زاوية المجس', 0, 90, 1, 45, '°'));
      ensure(defaultControl('line_count', 'عدد خطوط المجال', 8, 24, 1, 16, 'خط'));
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
  function param(values, key, fallback) {
    return values && typeof values[key] === 'number' ? values[key] : fallback;
  }
  function safeInfo(s) { return String(s || '').replace(/[<>]/g, ''); }

  ENGINE.createDefinition = function (raw, makeStage, addLights) {
    var spec = ENGINE.normalizeSpec(raw);
    var def = {
      id: 'generated',
      field: spec.field === 'biology' ? 'bio' : 'phy',
      fieldLabel: ({ physics: 'الفيزياء', biology: 'الأحياء', chemistry: 'الكيمياء', astronomy: 'الفلك', mathematics: 'الرياضيات' })[spec.field],
      icon: spec.engine === 'tokamak' ? 'atom' : spec.engine === 'wave' ? 'activity' : spec.engine === 'pendulum' ? 'clock' : spec.engine === 'interference' ? 'waves' : spec.engine === 'induction' ? 'zap' : spec.engine === 'diffraction' ? 'scan-eye' : spec.engine === 'dipole' ? 'magnet' : 'shapes',
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
        var rows = Object.keys(prm).map(function (k) {
          var c = def.params.filter(function (p) { return p.key === k; })[0];
          return [c ? c.label : k, prm[k].toFixed(2) + (c && c.unit ? ' ' + c.unit : '')];
        });
        if (spec.engine === 'interference') {
          var fringeMm = param(prm, 'wavelength', 550) * param(prm, 'distance', 1.5) /
            Math.max(.001, param(prm, 'separation', .25)) / 1000;
          rows.push(['المسافة بين الأهداب', fringeMm.toFixed(2) + ' mm']);
        }
        if (spec.engine === 'induction') {
          var peak = param(prm, 'turns', 100) * param(prm, 'field', .8) *
            param(prm, 'area', .04) * param(prm, 'angular_speed', 12);
          var phase = time * param(prm, 'angular_speed', 12);
          var emf = peak * Math.sin(phase);
          var fluxLinkage = param(prm, 'turns', 100) * param(prm, 'field', .8) *
            param(prm, 'area', .04) * Math.cos(phase);
          var current = emf / Math.max(.01, param(prm, 'resistance', 4));
          rows.push(['الجهد المستحث اللحظي', emf.toFixed(2) + ' V']);
          rows.push(['أقصى جهد مستحث', peak.toFixed(2) + ' V']);
          rows.push(['التيار اللحظي', current.toFixed(2) + ' A']);
          rows.push(['ارتباط الفيض المغناطيسي', fluxLinkage.toFixed(3) + ' Wb·turn']);
        }
        if (spec.engine === 'diffraction') {
          var ratio = param(prm, 'wavelength', 550) / (param(prm, 'grating_spacing', 5) * 1000);
          var firstOrder = ratio <= 1 ? (Math.asin(ratio) * 180 / Math.PI).toFixed(2) + '°' : 'غير متاح';
          rows.push(['زاوية الرتبة المضيئة الأولى', firstOrder]);
          rows.push(['أقصى رتبة ممكنة', String(Math.floor(1 / Math.max(1e-9, ratio)))]);
        }
        if (spec.engine === 'dipole') {
          var m = param(prm, 'moment', 2);
          var r = Math.max(.01, param(prm, 'probe_radius', 1.3));
          var th = param(prm, 'probe_angle', 45) * Math.PI / 180;
          var c = 1e-7 * m / (r * r * r);
          var bx = 3 * c * Math.sin(th) * Math.cos(th);
          var by = c * (3 * Math.cos(th) * Math.cos(th) - 1);
          var magnitude = c * Math.sqrt(1 + 3 * Math.cos(th) * Math.cos(th)) * 1e6;
          rows.push(['شدة المجال عند المجس', magnitude.toFixed(3) + ' μT']);
          rows.push(['المركبة الأفقية Bx', (bx * 1e6).toFixed(3) + ' μT']);
          rows.push(['المركبة الرأسية By', (by * 1e6).toFixed(3) + ' μT']);
        }
        return rows;
      };
      var actions = function () {
        return [
          { icon: playing ? 'pause' : 'play', label: playing ? 'إيقاف' : 'تشغيل', primary: true, fn: function () { playing = !playing; } },
          { icon: 'rotate-ccw', label: 'إعادة', fn: function () { reset(); } },
          { icon: 'eye', label: 'توسيط المشهد', fn: function () { st.target.set(0, 0, 0); st.sph.r = spec.engine === 'tokamak' ? 13.5 : 10; st.place(); } }
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
        function ratio(key, fallback) {
          var c = spec.controls.filter(function (x) { return x.key === key; })[0];
          if (!c) return fallback;
          return clamp((param(prm, key, c.value) - c.min) / Math.max(.0001, c.max - c.min), 0, 1);
        }
        // The vacuum vessel shares the plasma torus axis (vertical Y).
        var vessel = new T.Mesh(new T.TorusGeometry(R, tube * 1.08, 24, 112),
          new T.MeshPhongMaterial({ color: 0x5b8198, transparent: true, opacity: .075, shininess: 110, side: T.DoubleSide, depthWrite: false }));
        vessel.rotation.x = Math.PI / 2;
        S.add(vessel);

        // A deformable, translucent plasma volume replaces the rigid glowing arc.
        function plasmaSurface(radius, majorSeg, minorSeg, phase) {
          var positions = new Float32Array((majorSeg + 1) * (minorSeg + 1) * 3);
          var indices = [];
          for (var a = 0; a <= majorSeg; a++) {
            for (var b = 0; b <= minorSeg; b++) {
              var k = (a * (minorSeg + 1) + b) * 3;
              positions[k] = (R + radius) * Math.cos(a / majorSeg * Math.PI * 2);
              positions[k + 1] = radius * Math.sin(b / minorSeg * Math.PI * 2);
              positions[k + 2] = (R + radius) * Math.sin(a / majorSeg * Math.PI * 2);
            }
          }
          for (var x = 0; x < majorSeg; x++) {
            for (var y = 0; y < minorSeg; y++) {
              var p = x * (minorSeg + 1) + y, q = p + minorSeg + 1;
              indices.push(p, q, p + 1, q, q + 1, p + 1);
            }
          }
          var geo = new T.BufferGeometry();
          geo.setAttribute('position', new T.BufferAttribute(positions, 3));
          geo.setIndex(indices);
          geo.computeVertexNormals();
          return { geometry: geo, base: positions.slice(), major: majorSeg, minor: minorSeg, radius: radius, phase: phase };
        }
        var shellA = plasmaSurface(tube, 96, 20, 0);
        var shellB = plasmaSurface(tube * .68, 80, 16, 1.7);
        var plasmaOuterMat = new T.MeshPhongMaterial({
          color: 0x34d9ee, emissive: 0x07506b, emissiveIntensity: 1.35,
          transparent: true, opacity: .32, shininess: 95, side: T.DoubleSide,
          blending: T.AdditiveBlending, depthWrite: false
        });
        var plasmaInnerMat = new T.MeshBasicMaterial({
          color: 0x8bf5ff, transparent: true, opacity: .18,
          side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false
        });
        var plasma = new T.Mesh(shellA.geometry, plasmaOuterMat); S.add(plasma);
        var plasmaCore = new T.Mesh(shellB.geometry, plasmaInnerMat); S.add(plasmaCore);

        // Central solenoid: six distinct stacked superconducting modules.
        var core = new T.Mesh(new T.CylinderGeometry(.34, .34, 3.65, 40),
          new T.MeshPhongMaterial({ color: 0x33485a, metalness: .78, shininess: 72 }));
        S.add(core);
        var solenoidPackMaterial = new T.MeshPhongMaterial({
          color: 0x80664b, emissive: 0x140d06, specular: 0xbda17d,
          metalness: .72, shininess: 68
        });
        var solenoidRimMaterial = new T.MeshPhongMaterial({
          color: 0x9bb0bc, metalness: .82, shininess: 95
        });
        for (var cs = 0; cs < 6; cs++) {
          var pack = new T.Mesh(new T.CylinderGeometry(.66, .66, .43, 48, 1, false),
            solenoidPackMaterial);
          pack.position.y = -1.42 + cs * .57;
          S.add(pack);
          var rimTop = new T.Mesh(new T.TorusGeometry(.66, .035, 8, 48), solenoidRimMaterial);
          rimTop.position.y = pack.position.y + .205;
          rimTop.rotation.x = Math.PI / 2;
          S.add(rimTop);
          var rimBottom = new T.Mesh(new T.TorusGeometry(.66, .035, 8, 48), solenoidRimMaterial);
          rimBottom.position.y = pack.position.y - .205;
          rimBottom.rotation.x = Math.PI / 2;
          S.add(rimBottom);
        }

        // D-shaped superconducting coil housings: slimmer profile with a bright metal finish.
        var coilInner = R - .62, coilOuter = R + .72, coilHalfH = 1.48;
        var coilShape = new T.Shape();
        coilShape.moveTo(coilInner, -coilHalfH);
        coilShape.lineTo(coilInner, coilHalfH);
        coilShape.bezierCurveTo(coilInner + .12, coilHalfH + .22, coilOuter, coilHalfH + .22, coilOuter, 0);
        coilShape.bezierCurveTo(coilOuter, -coilHalfH - .22, coilInner + .12, -coilHalfH - .22, coilInner, -coilHalfH);
        coilShape.closePath();
        var coilGeometry = new T.ExtrudeGeometry(coilShape, {
          depth: .13,
          steps: 1,
          curveSegments: 18,
          bevelEnabled: true,
          bevelSegments: 3,
          bevelSize: .055,
          bevelThickness: .055
        });
        coilGeometry.translate(0, 0, -.065);
        var coilMaterial = new T.MeshPhongMaterial({
          color: 0x344b60,
          emissive: 0x071521,
          emissiveIntensity: .12,
          specular: 0x7893a5,
          shininess: 38
        });
        var coilEdgeGeometry = new T.EdgesGeometry(coilGeometry, 32);
        var coilEdgeMaterial = new T.LineBasicMaterial({
          color: 0x42cfff, transparent: true, opacity: .58
        });
        for (var c = 0; c < 18; c++) {
          var coilAngle = c / 18 * Math.PI * 2;
          var radialAxis = new T.Vector3(Math.cos(coilAngle), 0, Math.sin(coilAngle));
          var verticalAxis = new T.Vector3(0, 1, 0);
          var tangentAxis = new T.Vector3(-Math.sin(coilAngle), 0, Math.cos(coilAngle));
          var coilFrame = new T.Matrix4().makeBasis(radialAxis, verticalAxis, tangentAxis);
          var coil = new T.Mesh(coilGeometry, coilMaterial);
          coil.quaternion.setFromRotationMatrix(coilFrame);
          S.add(coil);
          var coilEdge = new T.LineSegments(coilEdgeGeometry, coilEdgeMaterial);
          coilEdge.quaternion.copy(coil.quaternion);
          S.add(coilEdge);
        }

        // Six horizontal poloidal-field coils shape and position the plasma.
        var pfMaterial = new T.MeshPhongMaterial({
          color: 0x526f82, emissive: 0x091722, specular: 0x9ebdcb,
          metalness: .76, shininess: 82
        });
        var pfCoils = [
          { y: -1.92, r: 3.62 }, { y: -1.28, r: 3.92 },
          { y: -.64, r: 4.12 }, { y: .64, r: 4.12 },
          { y: 1.28, r: 3.92 }, { y: 1.92, r: 3.62 }
        ];
        pfCoils.forEach(function (p) {
          var pf = new T.Mesh(new T.TorusGeometry(p.r, .085, 12, 112), pfMaterial);
          pf.rotation.x = Math.PI / 2;
          pf.position.y = p.y;
          S.add(pf);
        });

        // A faint open cylindrical cryostat envelope around the magnet assembly.
        var cryostat = new T.Mesh(
          new T.CylinderGeometry(4.32, 4.32, 4.95, 96, 1, true),
          new T.MeshPhongMaterial({
            color: 0x54748b, transparent: true, opacity: .065,
            shininess: 105, side: T.DoubleSide, depthWrite: false
          })
        );
        S.add(cryostat);
        var cryostatRimMaterial = new T.MeshPhongMaterial({
          color: 0x506d83, transparent: true, opacity: .38, metalness: .72, shininess: 90
        });
        [-2.48, 2.48].forEach(function (yy) {
          var rim = new T.Mesh(new T.TorusGeometry(4.32, .065, 10, 112), cryostatRimMaterial);
          rim.rotation.x = Math.PI / 2;
          rim.position.y = yy;
          S.add(rim);
        });

        var lineGroup = new T.Group(); S.add(lineGroup);
        var lineMats = [], lastField = -1;
        function rebuildFieldLines(fieldRatio) {
          while (lineGroup.children.length) {
            var old = lineGroup.children[0];
            lineGroup.remove(old);
            if (old.geometry) old.geometry.dispose();
            if (old.material) old.material.dispose();
          }
          lineMats = [];
          var pitch = 1.15 + fieldRatio * 2.7;
          for (var f = 0; f < 6; f++) {
            var points = [], phase = f * Math.PI * 2 / 6;
            for (var j = 0; j <= 180; j++) {
              var u = j / 180 * Math.PI * 4;
              var v = pitch * u + phase;
              var minor = tube * .99;
              points.push(new T.Vector3(
                (R + minor * Math.cos(v)) * Math.cos(u),
                minor * Math.sin(v),
                (R + minor * Math.cos(v)) * Math.sin(u)
              ));
            }
            var curve = new T.CatmullRomCurve3(points);
            var line = new T.Mesh(new T.TubeGeometry(curve, 180, .012 + fieldRatio * .006, 4, false),
              new T.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: .34 + fieldRatio * .34 }));
            lineGroup.add(line); lineMats.push(line.material);
          }
          lastField = fieldRatio;
        }
        rebuildFieldLines(ratio('field', .45));

        // Particles follow helical guiding-centre paths and a small gyro-orbit around them.
        var count = 620, particlePos = new Float32Array(count * 3);
        var particleColors = new Float32Array(count * 3);
        var particleSeeds = seeded(241), phi0 = new Float32Array(count), theta0 = new Float32Array(count);
        var rho0 = new Float32Array(count), gyro0 = new Float32Array(count), gyroSize = new Float32Array(count);
        for (var n = 0; n < count; n++) {
          phi0[n] = (particleSeeds() + 1) * Math.PI;
          theta0[n] = (particleSeeds() + 1) * Math.PI;
          rho0[n] = Math.sqrt((particleSeeds() + 1) * .5);
          gyro0[n] = (particleSeeds() + 1) * Math.PI;
          gyroSize[n] = .018 + Math.abs(particleSeeds()) * .026;
          var warm = n % 5 === 0;
          particleColors[n * 3] = warm ? 1 : .42;
          particleColors[n * 3 + 1] = warm ? .82 : .9;
          particleColors[n * 3 + 2] = warm ? .52 : 1;
        }
        var particleGeo = new T.BufferGeometry();
        particleGeo.setAttribute('position', new T.BufferAttribute(particlePos, 3));
        particleGeo.setAttribute('color', new T.BufferAttribute(particleColors, 3));
        var particles = new T.Points(particleGeo, new T.PointsMaterial({
          size: .067, vertexColors: true, transparent: true, opacity: .96,
          blending: T.AdditiveBlending, depthWrite: false, sizeAttenuation: true
        }));
        S.add(particles);

        // A smaller set of short streaks makes the helical direction visible.
        var trailLines = [], trailCount = 8, trailSteps = 14, trailSpan = .36;
        for (var tr = 0; tr < trailCount; tr++) {
          var trailArray = new Float32Array(trailSteps * 3), trailGeometry = new T.BufferGeometry();
          trailGeometry.setAttribute('position', new T.BufferAttribute(trailArray, 3));
          var trailLine = new T.Line(trailGeometry, new T.LineBasicMaterial({
            color: tr % 3 === 0 ? 0xffd58a : 0x9cefff,
            transparent: true, opacity: .48, blending: T.AdditiveBlending, depthWrite: false
          }));
          S.add(trailLine);
          trailLines.push({ geometry: trailGeometry, array: trailArray, particle: Math.floor(tr / trailCount * count) });
        }

        var hazeCount = 210, hazePos = new Float32Array(hazeCount * 3), hazeGeo = new T.BufferGeometry();
        var hazeSeeds = seeded(992), hazePhi = new Float32Array(hazeCount), hazeTheta = new Float32Array(hazeCount), hazeRho = new Float32Array(hazeCount);
        for (var hz = 0; hz < hazeCount; hz++) {
          hazePhi[hz] = (hazeSeeds() + 1) * Math.PI;
          hazeTheta[hz] = (hazeSeeds() + 1) * Math.PI;
          hazeRho[hz] = Math.sqrt((hazeSeeds() + 1) * .5) * .9;
        }
        hazeGeo.setAttribute('position', new T.BufferAttribute(hazePos, 3));
        var haze = new T.Points(hazeGeo, new T.PointsMaterial({
          color: 0x50dff5, size: .105, transparent: true, opacity: .2,
          blending: T.AdditiveBlending, depthWrite: false, sizeAttenuation: true
        }));
        S.add(haze);

        var glow = new T.PointLight(0x38bdf8, 1.8, 14); glow.position.set(0, 1.2, 0); S.add(glow);
        function particlePoint(index, atTime, out, isHaze) {
          var B = ratio('field', .45), heat = ratio('temperature', .45);
          var basePhi = isHaze ? hazePhi[index] : phi0[index];
          var baseTheta = isHaze ? hazeTheta[index] : theta0[index];
          var radial = isHaze ? hazeRho[index] : rho0[index];
          var phi = basePhi + atTime * (.24 + heat * 1.15);
          var pitch = 1.15 + B * 2.7;
          var theta = baseTheta + atTime * (.52 + heat * 1.1 + B * .45) + (phi - basePhi) * pitch;
          var minor = tube * (.12 + radial * .7);
          var gyroPhase = (isHaze ? index * 1.71 : gyro0[index]) + atTime * (2.5 + heat * 9);
          var gyro = isHaze ? .018 : gyroSize[index] * (.55 + heat * 1.4);
          var cross = minor * Math.cos(theta) + gyro * Math.cos(gyroPhase);
          var vertical = minor * Math.sin(theta) + gyro * Math.sin(gyroPhase);
          return out.set((R + cross) * Math.cos(phi), vertical, (R + cross) * Math.sin(phi));
        }
        var tempColor = new T.Color();
        function deformSurface(surface, atTime, heatRatio) {
          var attr = surface.geometry.attributes.position, base = surface.base;
          for (var i = 0; i < attr.count; i++) {
            var x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
            var phi = Math.atan2(z, x), theta = Math.atan2(y, Math.sqrt(x * x + z * z) - R);
            var pulse = Math.sin(phi * 5 - atTime * (1.1 + heatRatio * 2.6) + theta * 2);
            var ripple = Math.sin(phi * 9 + atTime * 1.7 + theta * 3) * .045;
            var radius = surface.radius * (1 + pulse * (.025 + heatRatio * .035) + ripple);
            var xx = R + radius * Math.cos(theta), yy = radius * Math.sin(theta);
            attr.array[i * 3] = xx * Math.cos(phi);
            attr.array[i * 3 + 1] = yy;
            attr.array[i * 3 + 2] = xx * Math.sin(phi);
          }
          attr.needsUpdate = true;
          surface.geometry.computeVertexNormals();
        }
        var particleVec = new T.Vector3(), trailVec = new T.Vector3(), hazeVec = new T.Vector3();
        updateModel = function () {
          var Bvalue = param(prm, 'field', 6), heat = param(prm, 'temperature', 8), density = param(prm, 'density', 5);
          var bRatio = ratio('field', .45), hRatio = ratio('temperature', .45), dRatio = ratio('density', .45);
          if (Math.abs(bRatio - lastField) > .015) rebuildFieldLines(bRatio);

          var hue = clamp(.55 - hRatio * .13, .41, .57);
          tempColor.setHSL(hue, .94, .58);
          plasmaOuterMat.color.copy(tempColor);
          plasmaOuterMat.emissive.copy(tempColor).multiplyScalar(.18);
          plasmaOuterMat.emissiveIntensity = .8 + hRatio * 2;
          plasmaOuterMat.opacity = .2 + dRatio * .23;
          plasmaInnerMat.opacity = .08 + dRatio * .16;
          glow.intensity = .85 + hRatio * 2.3;
          glow.distance = 11 + hRatio * 7;
          lineMats.forEach(function (m) { m.opacity = .24 + bRatio * .48; });

          deformSurface(shellA, time, hRatio);
          deformSurface(shellB, time * .83, hRatio);
          var visible = Math.floor(count * (.1 + dRatio * .9));
          for (var p = 0; p < visible; p++) {
            particlePoint(p, time, particleVec, false);
            particlePos[p * 3] = particleVec.x;
            particlePos[p * 3 + 1] = particleVec.y;
            particlePos[p * 3 + 2] = particleVec.z;
          }
          particleGeo.attributes.position.needsUpdate = true;
          particleGeo.setDrawRange(0, visible);

          var hazeVisible = Math.floor(hazeCount * (.12 + dRatio * .88));
          for (var h = 0; h < hazeVisible; h++) {
            particlePoint(h, time * .72, hazeVec, true);
            hazePos[h * 3] = hazeVec.x;
            hazePos[h * 3 + 1] = hazeVec.y;
            hazePos[h * 3 + 2] = hazeVec.z;
          }
          hazeGeo.attributes.position.needsUpdate = true;
          hazeGeo.setDrawRange(0, hazeVisible);

          trailLines.forEach(function (trail, ti) {
            var particle = Math.floor(ti / trailCount * visible);
            for (var step = 0; step < trailSteps; step++) {
              var past = time - trailSpan + trailSpan * step / (trailSteps - 1);
              particlePoint(particle, past, trailVec, false);
              trail.array[step * 3] = trailVec.x;
              trail.array[step * 3 + 1] = trailVec.y;
              trail.array[step * 3 + 2] = trailVec.z;
            }
            trail.geometry.attributes.position.needsUpdate = true;
          });
        };
        resetModel = function () { time = 0; updateModel(0); };
        updateModel(0);
        st.sph.r = 13.5; st.place();
      } else if (spec.engine === 'interference') {
        // Young's double-slit experiment: coherent monochromatic light and ideal far-field fringes.
        var screenW = 5.2, screenH = 3.2, screenZ = -4.05, barrierZ = .72;
        var screenGeo = new T.PlaneGeometry(screenW, screenH, 260, 8);
        var screenColors = new Float32Array(screenGeo.attributes.position.count * 3);
        screenGeo.setAttribute('color', new T.BufferAttribute(screenColors, 3));
        var screenMat = new T.MeshPhongMaterial({
          vertexColors: true, side: T.DoubleSide, shininess: 45,
          emissive: 0x061b2d, emissiveIntensity: .7
        });
        var screen = new T.Mesh(screenGeo, screenMat);
        screen.position.z = screenZ;
        S.add(screen);

        var frameMat = new T.MeshPhongMaterial({ color: 0x52687d, metalness: .78, shininess: 82 });
        var frameParts = [
          { x: 0, y: screenH / 2 + .07, w: screenW + .22, h: .14 },
          { x: 0, y: -screenH / 2 - .07, w: screenW + .22, h: .14 },
          { x: -screenW / 2 - .07, y: 0, w: .14, h: screenH },
          { x: screenW / 2 + .07, y: 0, w: .14, h: screenH }
        ];
        frameParts.forEach(function (p) {
          var bar = new T.Mesh(new T.BoxGeometry(p.w, p.h, .12), frameMat);
          bar.position.set(p.x, p.y, screenZ + .06);
          S.add(bar);
        });

        // Opaque barrier built from three panels, leaving two narrow vertical slits.
        var barrierMat = new T.MeshPhongMaterial({
          color: 0x26394b, metalness: .8, roughness: .42, shininess: 65
        });
        var panelRanges = [
          { x: -1.43, w: 1.94 },
          { x: 0, w: .78 },
          { x: 1.43, w: 1.94 }
        ];
        panelRanges.forEach(function (p) {
          var panel = new T.Mesh(new T.BoxGeometry(p.w, 3.35, .18), barrierMat);
          panel.position.set(p.x, 0, barrierZ);
          S.add(panel);
        });

        var slitEdgeMat = new T.MeshBasicMaterial({ color: 0x79eaff });
        [-.425, .425].forEach(function (sx) {
          [-.035, .035].forEach(function (dx) {
            var edge = new T.Mesh(new T.BoxGeometry(.018, 3.35, .20), slitEdgeMat);
            edge.position.set(sx + dx, 0, barrierZ);
            S.add(edge);
          });
        });

        // Incident beam and source glow.
        var source = new T.Mesh(new T.SphereGeometry(.18, 24, 18),
          new T.MeshPhongMaterial({ color: 0xb8f5ff, emissive: 0x1aa9da, emissiveIntensity: 1.8 }));
        source.position.set(0, 0, 2.25);
        S.add(source);
        var sourceGlow = new T.PointLight(0x40dfff, 1.9, 8);
        sourceGlow.position.copy(source.position);
        S.add(sourceGlow);

        // Expanding wavefronts pass through each slit toward the screen.
        var waveRings = [], ringMaterials = [];
        for (var slit = 0; slit < 2; slit++) {
          var slitX = slit === 0 ? -.425 : .425;
          for (var wr = 0; wr < 4; wr++) {
            var ringMat = new T.MeshBasicMaterial({
              color: slit === 0 ? 0x42d8ff : 0x9b8cff,
              transparent: true, opacity: .425, blending: T.AdditiveBlending,
              depthWrite: false, side: T.DoubleSide
            });
            var ring = new T.Mesh(new T.TorusGeometry(.52, .012, 6, 56), ringMat);
            ring.position.set(slitX, 0, barrierZ - .18);
            S.add(ring);
            waveRings.push({ mesh: ring, slit: slit, phase: wr / 4 });
            ringMaterials.push(ringMat);
          }
        }

        // Two reference rays connect the source to the two slit centres.
        var rayMaterials = [];
        [-.425, .425].forEach(function (sx) {
          var rayGeo = new T.BufferGeometry().setFromPoints([
            new T.Vector3(0, 0, 1.98), new T.Vector3(sx, 0, barrierZ + .16)
          ]);
          var rayMat = new T.LineBasicMaterial({ color: 0xffdf8a, transparent: true, opacity: .55 });
          S.add(new T.Line(rayGeo, rayMat));
          rayMaterials.push(rayMat);
        });

        var patternSignature = '';
        function updatePattern() {
          var lambdaNm = param(prm, 'wavelength', 550);
          var slitMm = param(prm, 'separation', .25);
          var distanceM = param(prm, 'distance', 1.5);
          var signature = lambdaNm + '|' + slitMm + '|' + distanceM;
          if (signature === patternSignature) return;
          patternSignature = signature;
          var pos = screenGeo.attributes.position;
          var halfPhysicalWidth = .05;
          for (var vi = 0; vi < pos.count; vi++) {
            var xWorld = pos.getX(vi);
            var xPhysical = (xWorld / (screenW / 2)) * halfPhysicalWidth;
            var phase = Math.PI * slitMm * 1e-3 * xPhysical / Math.max(1e-12, lambdaNm * 1e-9 * distanceM);
            var envelope = Math.exp(-Math.pow(xPhysical / .052, 4));
            var intensity = Math.pow(Math.cos(phase), 2) * envelope;
            var r = .012 + intensity * .12;
            var g = .025 + intensity * .78;
            var b = .065 + intensity * .92;
            var j = vi * 3;
            screenColors[j] = r;
            screenColors[j + 1] = g;
            screenColors[j + 2] = b;
          }
          screenGeo.attributes.color.needsUpdate = true;
        }

        updateModel = function () {
          updatePattern();
          waveRings.forEach(function (entry) {
            var cycle = (time * .27 + entry.phase) % 1;
            var scale = .28 + cycle * 1.12;
            entry.mesh.scale.set(scale, scale, 1);
            entry.mesh.position.z = barrierZ - .25 - cycle * 3.25;
            entry.mesh.material.opacity = .58 * (1 - cycle) + .06;
          });
          sourceGlow.intensity = .95 + .35 * (1 + Math.sin(time * 3));
          ringMaterials.forEach(function (m, i) {
            m.color.set(i % 4 === 0 ? 0x74e7ff : 0x5bbce8);
          });
        };
        resetModel = function () { time = 0; updateModel(0); };
        updateModel(0);
        st.sph.r = 10.5;
        st.place();
      } else if (spec.engine === 'induction') {
        // Faraday induction: rotating coil between N/S pole blocks in a uniform magnetic field.
        var fieldMat = new T.MeshBasicMaterial({
          color: 0x4ccfff, transparent: true, opacity: .34,
          blending: T.AdditiveBlending, depthWrite: false
        });
        var fieldYs = [-.95, 0, .95], fieldZs = [-.72, 0, .72];
        fieldYs.forEach(function (yy) {
          fieldZs.forEach(function (zz) {
            var lineGeo = new T.BufferGeometry().setFromPoints([
              new T.Vector3(-1.72, yy, zz), new T.Vector3(1.72, yy, zz)
            ]);
            S.add(new T.Line(lineGeo, fieldMat));
          });
        });

        var northMat = new T.MeshPhongMaterial({
          color: 0xa94343, emissive: 0x250606, metalness: .38, shininess: 55
        });
        var southMat = new T.MeshPhongMaterial({
          color: 0x315eaa, emissive: 0x07152b, metalness: .38, shininess: 55
        });
        var north = new T.Mesh(new T.BoxGeometry(.55, 2.55, 2.15), northMat);
        var south = new T.Mesh(new T.BoxGeometry(.55, 2.55, 2.15), southMat);
        north.position.x = -2.12; south.position.x = 2.12;
        S.add(north); S.add(south);

        function poleLabel(letter, fill, x) {
          var canvas = document.createElement('canvas');
          canvas.width = 128; canvas.height = 128;
          var ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, 128, 128);
          ctx.fillStyle = fill;
          ctx.beginPath(); ctx.arc(64, 64, 48, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 72px Arial';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(letter, 64, 66);
          var texture = new T.CanvasTexture(canvas);
          var sprite = new T.Sprite(new T.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
          sprite.scale.set(.55, .55, 1);
          sprite.position.set(x, 0, 1.12);
          S.add(sprite);
        }
        poleLabel('N', '#bd4141', -2.12);
        poleLabel('S', '#326ac2', 2.12);

        var poleArrow = new T.ArrowHelper(
          new T.Vector3(1, 0, 0), new T.Vector3(-1.75, 1.42, .9),
          3.5, 0x7be5ff, .2, .12
        );
        S.add(poleArrow);

        // Rotating rectangular copper coil in the magnetic gap.
        var rotor = new T.Group();
        S.add(rotor);
        var copperMat = new T.MeshPhongMaterial({
          color: 0xc47a43, emissive: 0x351607, specular: 0xffd1a1, shininess: 95
        });
        function addRod(w, h, d, x, y, z) {
          var rod = new T.Mesh(new T.BoxGeometry(w, h, d), copperMat);
          rod.position.set(x, y, z);
          rotor.add(rod);
        }
        addRod(.085, 1.48, .085, 0, 0, -.88);
        addRod(.085, 1.48, .085, 0, 0, .88);
        addRod(.085, .085, 1.84, 0, -.70, 0);
        addRod(.085, .085, 1.84, 0, .70, 0);

        var shaftMat = new T.MeshPhongMaterial({ color: 0x9babb8, metalness: .84, shininess: 100 });
        var shaft = new T.Mesh(new T.CylinderGeometry(.075, .075, 2.55, 20), shaftMat);
        rotor.add(shaft);

        // Charge carriers moving around the coil; direction reverses with induced current.
        var dotCount = 32, dotPositions = new Float32Array(dotCount * 3);
        var dotGeo = new T.BufferGeometry();
        dotGeo.setAttribute('position', new T.BufferAttribute(dotPositions, 3));
        var dotMaterial = new T.PointsMaterial({
          color: 0x59e8ff, size: .12, transparent: true, opacity: .9,
          blending: T.AdditiveBlending, depthWrite: false
        });
        var chargeDots = new T.Points(dotGeo, dotMaterial);
        rotor.add(chargeDots);
        function loopPoint(u, out) {
          var perimeter = ((u % 1) + 1) % 1 * 6.36;
          if (perimeter < 1.40) return out.set(0, -.70 + perimeter, -.88);
          perimeter -= 1.40;
          if (perimeter < 1.78) return out.set(0, .70, -.88 + perimeter);
          perimeter -= 1.78;
          if (perimeter < 1.40) return out.set(0, .70 - perimeter, .88);
          perimeter -= 1.40;
          return out.set(0, -.70, .88 - perimeter);
        }
        var dotVec = new T.Vector3();

        // Oscilloscope: one cycle of induced voltage and a marker for the current phase.
        var graphY = -2.02, graphZ = .15, graphWidth = 3.9, graphAmp = .43;
        var graphPoints = [];
        for (var gi = 0; gi <= 180; gi++) {
          var phasePoint = gi / 180 * Math.PI * 2;
          graphPoints.push(new T.Vector3(
            -graphWidth / 2 + graphWidth * gi / 180,
            graphY + Math.sin(phasePoint) * graphAmp,
            graphZ
          ));
        }
        var graphLine = new T.Line(
          new T.BufferGeometry().setFromPoints(graphPoints),
          new T.LineBasicMaterial({ color: 0x48d8ff, transparent: true, opacity: .9 })
        );
        S.add(graphLine);
        var axisGeo = new T.BufferGeometry().setFromPoints([
          new T.Vector3(-graphWidth / 2, graphY, graphZ - .01),
          new T.Vector3(graphWidth / 2, graphY, graphZ - .01)
        ]);
        S.add(new T.Line(axisGeo, new T.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: .45 })));
        var phaseMarker = new T.Mesh(new T.SphereGeometry(.085, 16, 12),
          new T.MeshBasicMaterial({ color: 0xffd166 }));
        S.add(phaseMarker);
        var graphLabel = new T.Mesh(new T.BoxGeometry(.9, .035, .035),
          new T.MeshBasicMaterial({ color: 0x52687d }));
        graphLabel.position.set(0, graphY - .62, graphZ);
        S.add(graphLabel);

        var coilLight = new T.PointLight(0x43dfff, 1.4, 9);
        coilLight.position.set(0, .8, 0); S.add(coilLight);
        function inductionValues() {
          var B = param(prm, 'field', .8);
          var A = param(prm, 'area', .04);
          var N = param(prm, 'turns', 100);
          var omega = param(prm, 'angular_speed', 12);
          var Rload = Math.max(.01, param(prm, 'resistance', 4));
          var phase = time * omega;
          var peak = N * B * A * omega;
          var emf = peak * Math.sin(phase);
          var flux = N * B * A * Math.cos(phase);
          return { phase: phase, peak: peak, emf: emf, flux: flux, current: emf / Rload };
        }
        updateModel = function () {
          var v = inductionValues();
          rotor.rotation.y = v.phase;
          dotMaterial.color.set(v.current >= 0 ? 0x5be7ff : 0xffc36b);
          dotMaterial.opacity = .22 + .78 * Math.min(1, Math.abs(v.current) * Math.max(.01, param(prm, 'resistance', 4)) / Math.max(.001, v.peak));
          for (var di = 0; di < dotCount; di++) {
            var direction = v.current >= 0 ? 1 : -1;
            var phaseU = di / dotCount + direction * time * .7;
            loopPoint(phaseU, dotVec);
            dotPositions[di * 3] = dotVec.x;
            dotPositions[di * 3 + 1] = dotVec.y;
            dotPositions[di * 3 + 2] = dotVec.z;
          }
          dotGeo.attributes.position.needsUpdate = true;
          var cycle = ((v.phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          phaseMarker.position.set(
            -graphWidth / 2 + graphWidth * cycle / (Math.PI * 2),
            graphY + Math.sin(cycle) * graphAmp,
            graphZ + .04
          );
          coilLight.intensity = .65 + .8 * Math.abs(Math.sin(v.phase));
        };
        resetModel = function () { time = 0; updateModel(0); };
        updateModel(0);
        st.sph.r = 12;
        st.place();
      } else if (spec.engine === 'dipole') {
        // Ideal magnetic dipole field; the magnet moment points along +Y.
        var magnetGroup = new T.Group();
        S.add(magnetGroup);
        var northMat = new T.MeshPhongMaterial({ color: 0xb94747, emissive: 0x280707, metalness: .42, shininess: 72 });
        var southMat = new T.MeshPhongMaterial({ color: 0x3469b4, emissive: 0x07182b, metalness: .42, shininess: 72 });
        var northPole = new T.Mesh(new T.CylinderGeometry(.34, .34, .68, 36), northMat);
        var southPole = new T.Mesh(new T.CylinderGeometry(.34, .34, .68, 36), southMat);
        northPole.position.y = .36;
        southPole.position.y = -.36;
        magnetGroup.add(northPole);
        magnetGroup.add(southPole);
        var poleRimMat = new T.MeshPhongMaterial({ color: 0xaebdc8, metalness: .8, shininess: 95 });
        [-.72, 0, .72].forEach(function (y) {
          var rim = new T.Mesh(new T.TorusGeometry(.34, .025, 8, 40), poleRimMat);
          rim.position.y = y;
          rim.rotation.x = Math.PI / 2;
          magnetGroup.add(rim);
        });

        function poleSprite(letter, fill, y) {
          var canvas = document.createElement('canvas');
          canvas.width = 128; canvas.height = 128;
          var ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, 128, 128);
          ctx.fillStyle = fill;
          ctx.beginPath(); ctx.arc(64, 64, 49, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 72px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(letter, 64, 66);
          var texture = new T.CanvasTexture(canvas);
          var sprite = new T.Sprite(new T.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
          sprite.scale.set(.5, .5, 1);
          sprite.position.set(.48, y, 0);
          S.add(sprite);
        }
        poleSprite('N', '#bd4141', .36);
        poleSprite('S', '#326ac2', -.36);

        var fieldGroup = new T.Group();
        S.add(fieldGroup);
        var fieldMaterials = [
          new T.MeshBasicMaterial({ color: 0x4edcff, transparent: true, opacity: .58, blending: T.AdditiveBlending, depthWrite: false }),
          new T.MeshBasicMaterial({ color: 0x9b8cff, transparent: true, opacity: .46, blending: T.AdditiveBlending, depthWrite: false })
        ];
        var lineDefinitions = [];
        var builtLineCount = 0;
        function rebuildDipoleLines() {
          while (fieldGroup.children.length) {
            var old = fieldGroup.children[0];
            fieldGroup.remove(old);
            if (old.geometry) old.geometry.dispose();
          }
          lineDefinitions = [];
          var count = Math.round(param(prm, 'line_count', 16));
          for (var n = 0; n < count; n++) {
            var level = Math.floor(n / 8);
            var slot = n % 8;
            var L = 1.45 + level * .72;
            var phi = slot / 8 * Math.PI * 2 + level * .19;
            var pts = [];
            for (var step = 0; step <= 100; step++) {
              var theta = .38 + (Math.PI - .76) * step / 100;
              var radius = L * Math.sin(theta) * Math.sin(theta);
              pts.push(new T.Vector3(
                radius * Math.sin(theta) * Math.cos(phi),
                radius * Math.cos(theta),
                radius * Math.sin(theta) * Math.sin(phi)
              ));
            }
            var curve = new T.CatmullRomCurve3(pts, false, 'centripetal');
            var tubeGeo = new T.TubeGeometry(curve, 100, .013, 5, false);
            var line = new T.Mesh(tubeGeo, fieldMaterials[n % 2]);
            fieldGroup.add(line);
            lineDefinitions.push({ L: L, phi: phi });
          }
          builtLineCount = count;
        }
        rebuildDipoleLines();

        // Animated tracers illustrate the direction of B from north to south.
        var tracerCount = 24, tracerPos = new Float32Array(tracerCount * 3);
        var tracerGeo = new T.BufferGeometry();
        tracerGeo.setAttribute('position', new T.BufferAttribute(tracerPos, 3));
        var tracerMat = new T.PointsMaterial({
          color: 0xe4faff, size: .105, transparent: true, opacity: .95,
          blending: T.AdditiveBlending, depthWrite: false
        });
        S.add(new T.Points(tracerGeo, tracerMat));

        // Probe location and local magnetic-field vector.
        var probe = new T.Group();
        S.add(probe);
        var probeBall = new T.Mesh(new T.SphereGeometry(.09, 20, 16),
          new T.MeshPhongMaterial({ color: 0xffd166, emissive: 0x6d4310, emissiveIntensity: .5 }));
        probe.add(probeBall);
        var fieldArrow = new T.ArrowHelper(new T.Vector3(1, 0, 0), new T.Vector3(), .8, 0xffd166, .17, .11);
        S.add(fieldArrow);

        function dipoleAt(r, theta, moment) {
          var c = 1e-7 * moment / (r * r * r);
          var stheta = Math.sin(theta), ctheta = Math.cos(theta);
          var bx = 3 * c * stheta * ctheta;
          var by = c * (3 * ctheta * ctheta - 1);
          var magnitude = c * Math.sqrt(1 + 3 * ctheta * ctheta);
          return { bx: bx, by: by, magnitude: magnitude };
        }
        var tracerVec = new T.Vector3();
        updateModel = function () {
          var wantedCount = Math.round(param(prm, 'line_count', 16));
          if (wantedCount !== builtLineCount) rebuildDipoleLines();
          var count = lineDefinitions.length;
          for (var pi = 0; pi < tracerCount; pi++) {
            var line = lineDefinitions[pi % count];
            var u = (time * .10 + pi / tracerCount) % 1;
            var theta = .38 + (Math.PI - .76) * u;
            var radius = line.L * Math.sin(theta) * Math.sin(theta);
            tracerVec.set(
              radius * Math.sin(theta) * Math.cos(line.phi),
              radius * Math.cos(theta),
              radius * Math.sin(theta) * Math.sin(line.phi)
            );
            tracerPos[pi * 3] = tracerVec.x;
            tracerPos[pi * 3 + 1] = tracerVec.y;
            tracerPos[pi * 3 + 2] = tracerVec.z;
          }
          tracerGeo.attributes.position.needsUpdate = true;

          var r = param(prm, 'probe_radius', 1.3);
          var theta = param(prm, 'probe_angle', 45) * Math.PI / 180;
          var moment = param(prm, 'moment', 2);
          var x = r * Math.sin(theta), y = r * Math.cos(theta);
          probe.position.set(x, y, 0);
          var B = dipoleAt(r, theta, moment);
          var direction = new T.Vector3(B.bx, B.by, 0).normalize();
          fieldArrow.position.set(x, y, 0);
          fieldArrow.setDirection(direction);
          var arrowLength = clamp(.45 + Math.log10(1 + B.magnitude * 1e7) * .22, .45, 1.25);
          fieldArrow.setLength(arrowLength, .18, .12);
          probeBall.scale.setScalar(1 + Math.min(.8, B.magnitude * 1e7));
        };
        resetModel = function () { time = 0; updateModel(0); };
        updateModel(0);
        st.sph.r = 10.2;
        st.place();

        // Fraunhofer diffraction from a finite-width N-slit grating.
        var screenW = 5.35, screenH = 3.35, screenZ = -4.25, gratingZ = .72;
        var screenGeo = new T.PlaneGeometry(screenW, screenH, 300, 8);
        var screenColors = new Float32Array(screenGeo.attributes.position.count * 3);
        screenGeo.setAttribute('color', new T.BufferAttribute(screenColors, 3));
        var screenMat = new T.MeshPhongMaterial({
          vertexColors: true, side: T.DoubleSide, shininess: 62,
          emissive: 0x06182a, emissiveIntensity: .65
        });
        var screen = new T.Mesh(screenGeo, screenMat);
        screen.position.z = screenZ;
        S.add(screen);

        var frameMat = new T.MeshPhongMaterial({ color: 0x536b80, metalness: .76, shininess: 86 });
        [
          { x: 0, y: screenH / 2 + .07, w: screenW + .2, h: .13 },
          { x: 0, y: -screenH / 2 - .07, w: screenW + .2, h: .13 },
          { x: -screenW / 2 - .065, y: 0, w: .13, h: screenH },
          { x: screenW / 2 + .065, y: 0, w: .13, h: screenH }
        ].forEach(function (p) {
          var frame = new T.Mesh(new T.BoxGeometry(p.w, p.h, .12), frameMat);
          frame.position.set(p.x, p.y, screenZ + .055);
          S.add(frame);
        });

        // Adjustable diffraction grating: opaque bars leave equally spaced vertical slits.
        var gratingGroup = new T.Group();
        S.add(gratingGroup);
        var barMat = new T.MeshPhongMaterial({
          color: 0x263b4c, metalness: .82, shininess: 82, specular: 0x8fb6cc
        });
        var slitGlowMat = new T.MeshBasicMaterial({ color: 0x65e8ff });
        var slitLineGeo = new T.BoxGeometry(.018, 3.5, .22);
        var slitWorldCenters = [];
        var gratingSignature = '';
        function rebuildGrating() {
          while (gratingGroup.children.length) {
            var old = gratingGroup.children[0];
            gratingGroup.remove(old);
            if (old.geometry && old.geometry !== slitLineGeo) old.geometry.dispose();
          }
          slitWorldCenters = [];
          var N = Math.round(param(prm, 'slit_count', 5));
          var d = param(prm, 'grating_spacing', 5);
          var visualGap = .22 + (d - 2) / 8 * .16;
          var slitWidth = .035 + (param(prm, 'slit_width', .35) - .1) / .7 * .025;
          var totalWidth = (N - 1) * visualGap + .72;
          var leftEdge = -totalWidth / 2, cursor = leftEdge, rightEdge = totalWidth / 2;
          for (var k = 0; k < N; k++) {
            var cx = (k - (N - 1) / 2) * visualGap;
            slitWorldCenters.push(cx);
            var barRight = cx - slitWidth / 2;
            if (barRight > cursor) {
              var bar = new T.Mesh(new T.BoxGeometry(barRight - cursor, 3.5, .22), barMat);
              bar.position.set((cursor + barRight) / 2, 0, gratingZ);
              gratingGroup.add(bar);
            }
            var edgeL = new T.Mesh(slitLineGeo, slitGlowMat);
            edgeL.position.set(cx - slitWidth / 2, 0, gratingZ);
            gratingGroup.add(edgeL);
            var edgeR = new T.Mesh(slitLineGeo, slitGlowMat);
            edgeR.position.set(cx + slitWidth / 2, 0, gratingZ);
            gratingGroup.add(edgeR);
            cursor = cx + slitWidth / 2;
          }
          if (cursor < rightEdge) {
            var finalBar = new T.Mesh(new T.BoxGeometry(rightEdge - cursor, 3.5, .22), barMat);
            finalBar.position.set((cursor + rightEdge) / 2, 0, gratingZ);
            gratingGroup.add(finalBar);
          }
          gratingSignature = N + '|' + d + '|' + slitWidth;
        }
        rebuildGrating();

        // Coherent source and incoming beam.
        var source = new T.Mesh(new T.SphereGeometry(.17, 20, 16),
          new T.MeshPhongMaterial({ color: 0xf2fbff, emissive: 0x2b9ecb, emissiveIntensity: 1.3 }));
        source.position.set(0, 0, 2.35);
        S.add(source);
        var sourceLight = new T.PointLight(0x65dfff, 1.35, 7);
        sourceLight.position.copy(source.position);
        S.add(sourceLight);
        var beamMat = new T.MeshBasicMaterial({
          color: 0x62dfff, transparent: true, opacity: .095,
          side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false
        });
        var beam = new T.Mesh(new T.PlaneGeometry(1.7, 3.1), beamMat);
        beam.position.set(0, 0, 1.54);
        S.add(beam);

        // Reusable wavefront geometry, repeated for each slit.
        var ringGeometry = new T.TorusGeometry(.28, .012, 6, 36);
        var ringMats = [
          new T.MeshBasicMaterial({ color: 0x52dcff, transparent: true, opacity: .42, blending: T.AdditiveBlending, depthWrite: false }),
          new T.MeshBasicMaterial({ color: 0x9a8cff, transparent: true, opacity: .34, blending: T.AdditiveBlending, depthWrite: false })
        ];
        var ringGroup = new T.Group();
        S.add(ringGroup);
        var wavefronts = [];
        function rebuildWavefronts() {
          while (ringGroup.children.length) ringGroup.remove(ringGroup.children[0]);
          wavefronts = [];
          slitWorldCenters.forEach(function (cx, si) {
            for (var wi = 0; wi < 2; wi++) {
              var mesh = new T.Mesh(ringGeometry, ringMats[(si + wi) % 2]);
              mesh.position.set(cx, 0, gratingZ - .18);
              ringGroup.add(mesh);
              wavefronts.push({ mesh: mesh, phase: wi * .5 + si * .13 });
            }
          });
        }
        rebuildWavefronts();

        // Monochromatic wavelength approximation for the displayed screen tint.
        function wavelengthRGB(nm) {
          var r = 0, g = 0, b = 0;
          if (nm >= 380 && nm < 440) { r = (440 - nm) / 60; b = 1; }
          else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
          else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
          else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
          else if (nm < 645) { r = 1; g = (645 - nm) / 65; }
          else { r = 1; }
          return new T.Color(clamp(r, 0, 1), clamp(g, 0, 1), clamp(b, 0, 1));
        }
        var patternSignature = '';
        function updateDiffractionPattern() {
          var lambda = param(prm, 'wavelength', 550) * 1e-9;
          var d = param(prm, 'grating_spacing', 5) * 1e-6;
          var a = param(prm, 'slit_width', .35) * 1e-6;
          var N = Math.round(param(prm, 'slit_count', 5));
          var L = param(prm, 'distance', 1.5);
          var signature = lambda + '|' + d + '|' + a + '|' + N + '|' + L;
          if (signature === patternSignature) return;
          patternSignature = signature;
          var pos = screenGeo.attributes.position;
          var base = wavelengthRGB(lambda * 1e9);
          for (var vi = 0; vi < pos.count; vi++) {
            var xWorld = pos.getX(vi);
            var xPhysical = (xWorld / (screenW / 2)) * .22;
            var sinTheta = xPhysical / Math.sqrt(L * L + xPhysical * xPhysical);
            var beta = Math.PI * d * sinTheta / lambda;
            var alpha = Math.PI * a * sinTheta / lambda;
            var denominator = Math.sin(beta);
            var interference = Math.abs(denominator) < 1e-7
              ? 1 : Math.pow(Math.sin(N * beta) / (N * denominator), 2);
            var diffraction = Math.abs(alpha) < 1e-7
              ? 1 : Math.pow(Math.sin(alpha) / alpha, 2);
            var intensity = clamp(interference * diffraction, 0, 1);
            var shade = .008 + Math.pow(intensity, .72) * .98;
            var j = vi * 3;
            screenColors[j] = .006 + base.r * shade;
            screenColors[j + 1] = .009 + base.g * shade;
            screenColors[j + 2] = .02 + base.b * shade;
          }
          screenGeo.attributes.color.needsUpdate = true;
        }

        updateModel = function () {
          var currentN = Math.round(param(prm, 'slit_count', 5));
          var dNow = param(prm, 'grating_spacing', 5);
          var wNow = param(prm, 'slit_width', .35);
          var gSig = currentN + '|' + dNow + '|' + (.035 + (wNow - .1) / .7 * .025);
          if (gSig !== gratingSignature) {
            rebuildGrating();
            rebuildWavefronts();
          }
          updateDiffractionPattern();
          wavefronts.forEach(function (entry) {
            var cycle = (time * .22 + entry.phase) % 1;
            var scale = .55 + cycle * 1.35;
            entry.mesh.scale.set(scale, scale, 1);
            entry.mesh.position.z = gratingZ - .24 - cycle * 3.65;
            entry.mesh.material.opacity = .5 * (1 - cycle) + .04;
          });
          sourceLight.intensity = .9 + .35 * (1 + Math.sin(time * 2.8));
        };
        resetModel = function () { time = 0; updateModel(0); };
        updateModel(0);
        st.sph.r = 10.8;
        st.place();

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
        getViewScale: function () {
          return Math.round(clamp((25 - st.sph.r) / 17 * 100, 0, 100));
        },
        setViewScale: function (value) {
          var n = clamp(finite(Number(value), 50), 0, 100);
          st.sph.r = 25 - (n / 100) * 17;
          st.place();
        },
        getState: function () { return { params: Object.assign({}, prm), spec: spec }; },
        actions: actions,
        readouts: readout,
        info: function () {
          if (spec.engine === 'tokamak') return 'تتحرك الجسيمات في مسارات حلزونية مع دوران مغزلي صغير حول خطوط المجال. تغيير شدة المجال يغيّر التفاف المسارات وميل خطوط المجال، والحرارة تغيّر سرعة الحركة والتموج، والكثافة تغيّر عدد الجسيمات ووهج البلازما. هذا نموذج بصري تعليمي مبسّط، لا يحل معادلات MHD ولا يتنبأ باستقرار مفاعل حقيقي.';
          if (spec.engine === 'pendulum') return 'يتحرك الثقل وفق معادلة البندول مع تكامل عددي مبسط وتخميد اختياري. النموذج ثنائي الأبعاد داخل مشهد ثلاثي الأبعاد.';
          if (spec.engine === 'wave') return 'يمثل الخط موجة جيبية مثالية. غيّر السعة والتردد وسرعة الانتشار ولاحظ تغير شكل الموجة وطورها.';
          if (spec.engine === 'induction') return 'يعرض النموذج قانون فاراداي للحث الكهرومغناطيسي: ε = −N dΦ/dt. عند دوران الملف في مجال منتظم يتغير الفيض Φ = BA cos(ωt)، فينشأ جهد متناوب سعته القصوى εmax = NBAω. المقاومة تحدد التيار اللحظي I = ε/R. النموذج مثالي ولا يحسب الفقد أو المجال غير المنتظم أو تأثير الحمل على سرعة الدوران.';
          if (spec.engine === 'interference') return 'تجربة شقي يونغ: تتراكب موجتان ضوئيتان مترابطتان فتظهر أهداب مضيئة ومعتمة على الشاشة. يحسب النموذج شدة الأهداب بالعلاقة I ∝ cos²(π d x / λ L)، ويعرض المسافة بين الأهداب Δy = λL/d. النموذج يفترض ضوءاً أحادي اللون وشقين مثاليين وتقريب المجال البعيد، ولا يحسب حيود الشق ذي العرض المحدود.';
          if (spec.engine === 'diffraction') return 'محزوز الحيود يتكون من عدد كبير من الشقوق المتوازية. تتحدد الاتجاهات الرئيسية المضيئة بشرط d sin(θ) = mλ، بينما يحدد عرض الشق غلاف الحيود. يحسب النموذج نمط فراونهوفر لشقوق متساوية مثالية: I ∝ sinc²(α) [sin(Nβ)/(N sin(β))]². غيّر الطول الموجي وتباعد الشقوق وعددها وعرضها وبعد الشاشة. نهمل خشونة المحزوز والانعكاسات والفقد.';
          if (spec.engine === 'dipole') return 'يمثل المغناطيس ثنائي القطب بعزم m موجّه على محور +Y. تُحسب خطوط المجال من علاقة خطوط ثنائي القطب r = L sin²(θ)، ويُحسب المجال عند المجس من B = μ₀m/(4πr³) √(1 + 3cos²θ). غيّر العزم وموقع المجس وعدد خطوط العرض. يفترض النموذج مغناطيساً مثالياً بعيد المجال، ولا يمثل تفاصيل المجال داخل مادة المغناطيس.';
          return spec.assumptions || spec.principle || spec.summary;
        },
        dispose: function () { st.dispose(); }
      };
    };
    return def;
  };

  window.MUKHTABAR_ENGINE = ENGINE;
})();