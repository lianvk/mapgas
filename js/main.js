// function GoToPlace(xx,yy,zoom,gr){
//     myMap.setCenter([xx,yy],zoom);
//     group_id=gr;   
//     };

//добавляем обьект "Метка обычная"
function MetkaAdd(tx1,ty1){            
    var arr=[tx1, ty1];
    comment="Объект потребления газа";
    preset="twirl#greenStretchyIcon";
    presetcolor="#ffffff";                            
    point_add(arr,comment,preset,presetcolor);            
};    

//добавляем обьект "Линия"
function GasLineAdd(tx1,ty1){    
    strokeColor='#ff0000';          
    strokeWidth=4;  
    var arr=[[tx1, ty1]];
    polyadd(arr,strokeColor,strokeWidth,true);
};        

//добавляем обьект "Зона покрытия Замкнутая ломаная"
function AreaLineAdd(){
    strokeColor='#ff00ff';          
    strokeWidth=4;  
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
            if (cr=="Area"){
                cr=ob.geometry.getCoordinates();
                strokeWidth=ob.options.get("strokeWidth");
                strokeColor=ob.options.get("strokeColor");
                ars.push({cid:cid,type:"Area",strokeWidth:strokeWidth,strokeColor:strokeColor,coords:cr});
            };
            if (cr=="Poly"){
                cr=ob.geometry.getCoordinates();
                strokeWidth=ob.options.get("strokeWidth");
                strokeColor=ob.options.get("strokeColor");
                ars.push({cid:cid,type:"Poly",strokeWidth:strokeWidth,strokeColor:strokeColor,coords:cr});
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
        controls: ['searchControl'],
        type: 'custom_map#map'
    },  {
                restrictMapArea: true,
                searchControlProvider: 'yandex#search'
    },);

    var rulerControl = new ymaps.control.RulerControl({
        options: {
            layout: 'round#rulerLayout'
        }
    });
    myMap.controls.add(rulerControl);

    var zoomControl = new ymaps.control.ZoomControl({
        options: {
            layout: 'round#zoomLayout'
        }
    });
    myMap.controls.add(zoomControl);

    // Кнопка ОПГ
var OPGbutton = new ymaps.control.Button({
    data: {
        image: 'images/gasopg.png',
        title: 'Добавить ОПГ'
    },
    options: {
        layout: 'round#buttonLayout',
        maxWidth: 120,
        position: {
            top: '90px',
            right: '10px'
        },
        selectOnClick: false
    }
});

OPGbutton.events.add('click', function(e) {
    needadd=0;
})

myMap.controls.add(OPGbutton);

// кнопка сегмент

var Segmentbutton = new ymaps.control.Button({
    data: {
        image: 'images/gas.png',
        title: 'Добавить сегмент газопровода'
    },
    options: {
        layout: 'round#buttonLayout',
        maxWidth: 120,
        position: {
            top: '140px',
            right: '10px'
        },
        selectOnClick: false
    }
});

Segmentbutton.events.add('click', function(e) {
    needadd=1;
})

myMap.controls.add(Segmentbutton);

// кнопка полигон

var Polygonbutton = new ymaps.control.Button({
    data: {
        image: 'images/polygon.png',
        title: 'Добавить полигон'
    },
    options: {
        layout: 'round#buttonLayout',
        maxWidth: 120,
        position: {
            top: '190px',
            right: '10px'
        },
        selectOnClick: false
    }
});

Polygonbutton.events.add('click', function(e) {
    AreaLineAdd();
    needadd=2;
})

myMap.controls.add(Polygonbutton);

// кнопка удалить

var Deletebutton = new ymaps.control.Button({
    data: {
        image: 'images/delete.png',
        title: 'Удалить'
    },
    options: {
        layout: 'round#buttonLayout',
        maxWidth: 120,
        position: {
            top: '290px',
            right: '10px'
        },
    }
});

Deletebutton.events.add('click', function(e) {
})

myMap.controls.add(Deletebutton);

// кнопка сохранить

var Savebutton = new ymaps.control.Button({
    data: {
        image: 'images/save.png',
        title: 'Сохранить'
    },
    options: {
        layout: 'round#buttonLayout',
        maxWidth: 120,
        position: {
            top: '10px',
            right: '10px'
        },
    }
});

Savebutton.events.add('click', function(e) {
})

myMap.controls.add(Savebutton);

/* добавляем на карту контрол выбора типа с указанием стандартных карт и вновь созданной */    
myMap.controls.add(new ymaps.control.TypeSelector({
    options: {
        layout: 'round#listBoxLayout',
        itemLayout: 'round#listBoxItemLayout',
        itemSelectableLayout: 'round#listBoxItemSelectableLayout',
        float: 'none',
        position: {
            bottom: '40px',
            left: '10px'
        }
    },
    mapTypes: ['custom_map#map','yandex#map', 'yandex#hybrid', 'yandex#satellite'],
}));

myMap.events.add('click', function (e) {
    if (needadd!='null'){
            var coords = e.get('coords');
            mclickx=coords[0].toPrecision(6); //где щелкнули?
            mclicky=coords[1].toPrecision(6);
            if (needadd=='0'){MetkaAdd(mclickx,mclicky);needadd='null';myMap.cursors.push("arrow");};
            if (needadd=='1'){GasLineAdd(mclickx,mclicky);needadd='null';myMap.cursors.push("arrow");};
            if (needadd=='2'){AreaLineAdd(mclickx,mclicky);needadd='null';myMap.cursors.push("arrow");};
            if (needadd=='3'){SaveObjects();};};
        });
                    
        

    });

        function polyadd(txtycoor,strokeColor,strokeWidth,modeadd){   
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
                      //включаем сразу режим редактирования!  
                      myPolyline.editor.startDrawing();                                
                    };
                     
            };


//Зона покрытия
function arealine_add(txtycoor,strokeColor,strokeWidth,modeadd){        
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
          //включаем сразу режим редактирования!  
           myPolygon.editor.startDrawing();                                
        };
};

//метка
function point_add(txtycoor,comment,preset,presetcolor){    
    myGeoObject = new ymaps.GeoObject({
        // Описание геометрии.
        geometry: {
            type: "Point",
            coordinates: txtycoor
        },            
        // Свойства.
        properties: {
            // Контент метки.
            hintContent: comment,
            balloonContent:comment
        }
        }, {
        // Опции.
        // Иконка метки будет растягиваться под размер ее содержимого.
        preset: preset,
        // Метку можно перемещать.
        draggable: true,
        tfig:"Point"
    });  
            myGeoObject.events.add('contextmenu', function (e) {
                   // Если меню метки уже отображено, то убираем его.
                   if ($('#menu').css('display') == 'block') {
                       $('#menu').remove();
                   } else {
                       // HTML-содержимое контекстного меню.
                       var menuContent ='<div id="menu">\
                               <ul id="menu_list">\
                                   <li>Название:  <input type="text" name="icon_text" /></li>\
                                   <li>Подсказка:  <input type="text" name="hint_text" /></li>\
                               </ul>\
                           <div align="center"><input type="submit" value="Сохранить" /></div>\
                           </div>';
                       // Размещаем контекстное меню на странице
                       $('body').append(menuContent);
                       // Задаем позицию меню.
                       $('#menu').css({
                           left: e.get('pagePixels')[0],
                           top: e.get('pagePixels')[1]
                       });
                       // Заполняем поля контекстного меню текущими значениями свойств метки.
                       $('#menu input[name="icon_text"]').val(e.get('target').properties.get('iconContent'));
                       $('#menu input[name="hint_text"]').val(e.get('target').properties.get('hintContent'));
                       // При нажатии на кнопку "Сохранить" изменяем свойства метки
                       // значениями, введенными в форме контекстного меню.
                       $('#menu input[type="submit"]').click(function () {
                           e.get('target').properties.set({
                               hintContent: $('input[name="hint_text"]').val(),
                               balloonContent: $('input[name="hint_text"]').val()
                           });
                           // Удаляем контекстное меню.
                           $('#menu').remove();
                       });
                   }
               });        
                
    myCollection.add(myGeoObject); //добавляем в коллекцию    
    myMap.geoObjects.add(myCollection); // добавляем на холст
};




        

