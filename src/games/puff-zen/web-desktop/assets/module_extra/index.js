System.register("chunks:///_virtual/Layout_AboutMe.ts",["./rollupPluginModLoBabelHelpers.js","cc"],(function(t){var e,o,r,n,i,a,u,c;return{setters:[function(t){e=t.applyDecoratedDescriptor,o=t.inheritsLoose,r=t.initializerDefineProperty,n=t.assertThisInitialized},function(t){i=t.cclegacy,a=t._decorator,u=t.Button,c=t.Component}],execute:function(){var l,s,p,y,b;i._RF.push({},"41300Uxcp1B86xiFT3aEHoZ","Layout_AboutMe",void 0);var f=a.ccclass,_=a.property;t("Layout_AboutMe",(l=f("Layout_AboutMe"),s=_(u),l((b=e((y=function(t){function e(){for(var e,o=arguments.length,i=new Array(o),a=0;a<o;a++)i[a]=arguments[a];return e=t.call.apply(t,[this].concat(i))||this,r(e,"btnClose",b,n(e)),e}return o(e,t),e}(c)).prototype,"btnClose",[s],{configurable:!0,enumerable:!0,writable:!0,initializer:null}),p=y))||p));i._RF.pop()}}}));

System.register("chunks:///_virtual/module_extra",["./Layout_AboutMe.ts","./UI_AboutMe_Impl.ts"],(function(){return{setters:[null,null],execute:function(){}}}));

System.register("chunks:///_virtual/UI_AboutMe_Impl.ts",["./rollupPluginModLoBabelHelpers.js","cc","./tgx.ts","./GameUILayers.ts","./UIDef.ts","./Layout_AboutMe.ts","./ModuleContext.ts"],(function(t){var e,n,o,u,i,s;return{setters:[function(t){e=t.inheritsLoose},function(t){n=t.cclegacy},null,function(t){o=t.GameUILayers},function(t){u=t.UI_AboutMe},function(t){i=t.Layout_AboutMe},function(t){s=t.ModuleContext}],execute:function(){n._RF.push({},"13f70PYPfhGfK4XD/izHH3E","UI_AboutMe_Impl",void 0);var r=t("UI_AboutMe_Impl",function(t){function n(){return t.call(this,"ui_about/UI_AboutMe",o.POPUP,i)||this}e(n,t);var u=n.prototype;return u.getRes=function(){return[]},u.onCreated=function(){var t=this,e=this.layout;this.onButtonEvent(e.btnClose,(function(){t.hide()}))},n}(u));s.attachImplClass(u,r),n._RF.pop()}}}));

(function(r) {
  r('virtual:///prerequisite-imports/module_extra', 'chunks:///_virtual/module_extra'); 
})(function(mid, cid) {
    System.register(mid, [cid], function (_export, _context) {
    return {
        setters: [function(_m) {
            var _exportObj = {};

            for (var _key in _m) {
              if (_key !== "default" && _key !== "__esModule") _exportObj[_key] = _m[_key];
            }
      
            _export(_exportObj);
        }],
        execute: function () { }
    };
    });
});