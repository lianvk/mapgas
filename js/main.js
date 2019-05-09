function GoToPlace(xx,yy,zoom,gr){
    myMap.setCenter([xx,yy],zoom);
    group_id=gr;   
    };

    ymaps.ready(function () {

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

});

$(document).ready(function(){
    $('.header').height($(window).height());
   })

   $(document).ready(function() {
    $(".dropdown-toggle").dropdown();
});