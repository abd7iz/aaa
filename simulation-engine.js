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

        // Central solenoid: a vertical magnetic core with stacked windings.
        var core = new T.Mesh(new T.CylinderGeometry(.34, .34, 3.15, 32),
          new T.MeshPhongMaterial({ color: 0x536579, metalness: .72, shininess: 85 }));
        S.add(core);
        for (var cw = 0; cw < 7; cw++) {
          var winding = new T.Mesh(new T.TorusGeometry(.43, .045, 8, 32),
            new T.MeshPhongMaterial({ color: 0xb97843, metalness: .72, shininess: 90 }));
          winding.position.y = -1.15 + cw * .38;
          winding.rotation.x = Math.PI / 2;
          S.add(winding);
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
          depth: .17,
          steps: 1,
          curveSegments: 18,
          bevelEnabled: true,
          bevelSegments: 3,
          bevelSize: .055,
          bevelThickness: .055
        });
        coilGeometry.translate(0, 0, -.085);
        var coilMaterial = new T.MeshPhongMaterial({
          color: 0xb8d2df,
          emissive: 0x24485d,
          emissiveIntensity: .72,
          specular: 0xf0fbff,
          shininess: 105
        });
        var coilEdgeGeometry = new T.EdgesGeometry(coilGeometry, 32);
        var coilEdgeMaterial = new T.LineBasicMaterial({
          color: 0x75dfff, transparent: true, opacity: .42
        });
        for (var c = 0; c < 10; c++) {
          var coilAngle = c / 10 * Math.PI * 2;
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

        // Subtle structural support rings above and below the coil set.
        var supportMat = new T.MeshPhongMaterial({
          color: 0x526477, metalness: .8, shininess: 90, transparent: true, opacity: .62
        });
        [-1.82, 1.82].forEach(function (yy) {
          var support = new T.Mesh(new T.TorusGeometry(coilOuter - .08, .055, 10, 96), supportMat);
          support.rotation.x = Math.PI / 2;
          support.position.y = yy;
          S.add(support);
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
        var count = 760, particlePos = new Float32Array(count * 3);
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

        var hazeCount = 260, hazePos = new Float32Array(hazeCount * 3), hazeGeo = new T.BufferGeometry();
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
          return spec.assumptions || spec.principle || spec.summary;
        },
        dispose: function () { st.dispose(); }
      };
    };
    return def;
  };

  window.MUKHTABAR_ENGINE = ENGINE;
})();