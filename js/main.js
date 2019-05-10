function GoToPlace(xx,yy,zoom,gr){
    myMap.setCenter([xx,yy],zoom);
    group_id=gr;   
    };

//добавляем обьект "Линия"
function GasLineAdd(tx1,ty1){
    //tx2=Number(tx1)+0.001;
    //ty2=Number(ty1)+0.001;    
    strokeColor='#ff0000';          
    strokeWidth=4;  
    //var arr=[[tx1, ty1],[tx2, ty2]];
    var arr=[[tx1, ty1]];
    polyadd(arr,strokeColor,strokeWidth,true);
};        

//добавляем обьект "Зона покрытия Замкнутая ломаная"
function AreaLineAdd(){
    strokeColor='#ff00ff';          
    strokeWidth=4;  
    //var arr=[[tx1, ty1]];
    var arr=[[]];
    arealine_add(arr,strokeColor,strokeWidth,true);
};    

function SaveObjects(){
  //сначала всё удаляем, потом сразуже сохраняем...            
        cid=0;          
        var ars = [];
        myCollection.each(function(ob) {
            zxcv=ob;
            cr=ob.options.get("tfig");
            //alert(cr);
            if (cr=="Area"){
                cr=ob.geometry.getCoordinates();
                strokeWidth=ob.options.get("strokeWidth");
                strokeColor=ob.options.get("strokeColor");
                ars.push({cid:cid,type:"Area",strokeWidth:strokeWidth,strokeColor:strokeColor,coords:cr});
                //$.post( "controller/server/lanbilling/maps/addobjects.php?blibase="+billing_id+"&group_id="+group_id, { type: "Poly", coords: cr,strokeWidth:strokeWidth,strokeColor:strokeColor});
                //alert("Poly:"+cr);
            };
            if (cr=="Poly"){
                cr=ob.geometry.getCoordinates();
                strokeWidth=ob.options.get("strokeWidth");
                strokeColor=ob.options.get("strokeColor");
                ars.push({cid:cid,type:"Poly",strokeWidth:strokeWidth,strokeColor:strokeColor,coords:cr});
                //$.post( "controller/server/lanbilling/maps/addobjects.php?blibase="+billing_id+"&group_id="+group_id, { type: "Poly", coords: cr,strokeWidth:strokeWidth,strokeColor:strokeColor});
                //alert("Poly:"+cr);
            };                   
            if (cr=="Point"){
                olala=ob;
                cr=ob.geometry.getCoordinates();
                iconContent=ob.properties.get("iconContent");
                hintContent=ob.properties.get("hintContent");
                preset=ob.options.get("preset");                        
                ars.push({cid:cid,type:"Point",iconContent:iconContent,hintContent:hintContent,preset:preset,coords:cr});
                //$.post( "controller/server/lanbilling/maps/addobjects.php?blibase="+billing_id+"&group_id="+group_id, { type: "Point", coords: cr,iconContent:iconContent,hintContent:hintContent});                        
                //alert("Point:"+cr);
            };
          cid++;  
        });                  
        $.post( "addobjects.php?blibase="+billing_id+"&group_id="+group_id+"&layer="+type_layout, {param: JSON.stringify(ars)});                                                  
};
var myMap;

    ymaps.ready(function () {

        myCollection = new ymaps.GeoObjectCollection();

/*  получаем из хранилища встроенный тип слоя */
let YandexMapLayer = ymaps.layer.storage.get('yandex#map');

/*  Дочерний класс слоя с перекрытием метода getZoomRange */
let CustomMapLayer = function () {
    /* Calling the parent's constructor */
    CustomMapLayer.superclass.constructor.call(this);
    
    /*  в служебных полях объявляем максимально доступный зум и интересующую нас степерь масштабирования слоя*/
    this._maxAvaliableZoom = 19; 
    this._zoomRange = [0, 22]; 
}

/*  выполняем наследование */
ymaps.util.augment(CustomMapLayer, YandexMapLayer, {
    /* Переопределяем в наследнике метод getZoomRange */
    getZoomRange: function (point) {
        let _this = this;
        /* Вызываем асинхронный метод родительского класса. */
        CustomMapLayer.superclass.getZoomRange.call(this, point).then(function(zoomRange) {
            /* 
             * на случай, если в какой-то местности доступный уровень зума отличается от значения 19 
             * - делаем обновление локального поля (для дайльнейшего расчета степени искусственного увеличения тайлов) 
             * но на практике - тайлы с уровнем зума 19 есть везде (Москва и любая степь...), более 19 - тайлов нет
             */
            if (zoomRange[1] != _this._maxAvaliableZoom) {
                _this._maxAvaliableZoom = zoomRange[1];
            }
        });
        return ymaps.vow.resolve(_this._zoomRange);
    }
});

let YCustomMapLayer = function () {

    let layer = new CustomMapLayer();
    let defaultTileUrlTemplate = layer.getTileUrlTemplate();
    
    /* перекрытие размера тайла */
    layer.getTileSize = function(zoom) {
        
        let pixelRatio = ymaps.util.hd.getPixelRatio();
        if(zoom > layer._maxAvaliableZoom) {
            /* считаем требуемую степень масштабирования тайла */
            let scale = 2**(zoom - layer._maxAvaliableZoom);
            let tailImageScale = scale * pixelRatio;
            
            /*  подменяем урл получения тайла - при запросе тайла требуемого масштаба - сохраняем качество отобржения карты */
            /*  фиксируем зум на уровне максимально доступного */
            /*  дополнительно делаем проверку на запрашиваемый масштаб тайла, т.к. максимально доступный масштаб изображения - 16 */
            let zoomOverTileUrlTemplate = defaultTileUrlTemplate
                .replace("%c", "x=%x&y=%y&z="+layer._maxAvaliableZoom)
                .replace("{{ scale }}", tailImageScale > 16 ? 16: tailImageScale);
                
            console.log("zoomOverTileUrlTemplate", zoomOverTileUrlTemplate);
            
            layer.setTileUrlTemplate(zoomOverTileUrlTemplate);
            return [256 * scale, 256 * scale];
        }

        /* установка дефотного шаблона url */
        layer.setTileUrlTemplate(defaultTileUrlTemplate);
        
        /* возвращем дефолтный размер тайла */
        return [256, 256];
    };
    
    return layer;
};

/* регистрируем новый тип слоя */
ymaps.layer.storage.add('custom#map', YCustomMapLayer);

/* создаем новый тип карты с кастомным слоем */
let customMapType = new ymaps.MapType('Схема +', ['custom#map']);

/* регистрируем новый тип карты */
ymaps.mapType.storage.add('custom_map#map', customMapType);

/* выполняем инициализацию карты, с указанием вновь созданного типа */
myMap = new ymaps.Map(
    // ID DOM-элемента, в который будет добавлена карта.
    'map',
    // Параметры карты.
    {
        // Географические координаты центра отображаемой карты.
        center: [59.95, 30.19], // Москва
        // Масштаб.
        zoom: 10,
        controls: ['zoomControl','searchControl', 'rulerControl'],
        type: 'custom_map#map'
    }, {
                restrictMapArea: true,
                searchControlProvider: 'yandex#search'
    });

   
/* добавляем на карту контрол выбора типа с указанием стандартных карт и вновь созданной */    
myMap.controls.add(new ymaps.control.TypeSelector({
    mapTypes: ['custom_map#map','yandex#map', 'yandex#hybrid', 'yandex#satellite'],
}));

myMap.events.add('click', function (e) {
    //alert(needadd);
    if (needadd!='null'){
            var coords = e.get('coords');
            mclickx=coords[0].toPrecision(6); //где щелкнули?
            mclicky=coords[1].toPrecision(6);
            if (needadd=='1'){GasLineAdd(mclickx,mclicky);needadd='null';myMap.cursors.push("arrow");};
            if (needadd=='2'){AreaLineAdd(mclickx,mclicky);needadd='null';myMap.cursors.push("arrow");};
            if (needadd=='3'){SaveObjects();};};
        });
    });

        function polyadd(txtycoor,strokeColor,strokeWidth,modeadd){
                //alert("polyadd"+tx1+"!"+tx2+"!"+ty1+"!"+ty2+"!"+strokeColor+"!"+strokeWidth);
                        //var arr=[[tx1, ty1],[tx2, ty2]];    
                        var myPolyline = new ymaps.Polyline(txtycoor, {}, {
                                // Задаем опции геообъекта.
                                // Цвет с прозрачностью.
                                strokeColor: strokeColor,
                                // Ширину линии.
                                strokeWidth: strokeWidth,
                                // Максимально допустимое количество вершин в ломаной.
                                editorMaxPoints: 50,
                                editorMenuManager: function (items) {
                                     items.push({
                                         title: "Удалить линию",
                                         onClick: function () {                                 
                                              myCollection.remove(cured);
                                              myMap.geoObjects.remove(cured);
                                         }
                                     });
                                     return items;
                                 },                    
                                draggable: true,
                                tfig:"Poly",
                                // Добавляем в контекстное меню новый пункт, позволяющий удалить ломаную.
                            });               
                    myPolyline.events.add('click', function (e) {
                        if (cured!='null') cured.editor.stopEditing();
                        e.get('target').editor.startEditing();            
                        cured=e.get('target');
                    });
                    myCollection.add(myPolyline); 
                    myMap.geoObjects.add(myCollection);    
                    if (modeadd==true){
                        //alert("!");
                      //включаем сразу режим редактирования!  
                      myPolyline.editor.startDrawing();                                
                    };
                     
            };


//Зона покрытия
function arealine_add(txtycoor,strokeColor,strokeWidth,modeadd){    
    //alert(txtycoor);
    //alert("polyadd"+tx1+"!"+tx2+"!"+ty1+"!"+ty2+"!"+strokeColor+"!"+strokeWidth);
            //var arr=[[tx1, ty1],[tx2, ty2]];    
            var myPolygon = new ymaps.Polygon(txtycoor, {}, {
                    // Задаем опции геообъекта.
                    // Цвет с прозрачностью.
                    strokeColor: strokeColor,
                    // Ширину линии.
                    strokeWidth: strokeWidth,
                    // Максимально допустимое количество вершин в ломаной.
                    editorMaxPoints: 50,
                    editorMenuManager: function (items) {
                         items.push({
                             title: "Удалить линию",
                             onClick: function () {                                 
                                  myCollection.remove(cured);
                                  myMap.geoObjects.remove(cured);
                             }
                         });
                         return items;
                     },                    
                    draggable: true,
                    tfig:"Area",
                    // Добавляем в контекстное меню новый пункт, позволяющий удалить ломаную.
                });               
        myPolygon.events.add('click', function (e) {
            if (cured!='null') cured.editor.stopEditing();
            e.get('target').editor.startEditing();            
            cured=e.get('target');
        });
        myCollection.add(myPolygon); 
        myMap.geoObjects.add(myCollection);    
        if (modeadd==true){
            //alert("!");
          //включаем сразу режим редактирования!  
          myPolygon.editor.startDrawing();                                
        };
};
