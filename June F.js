// за основу взят пример https://wiki.amperka.ru/yodo#сканер_ик-пультов
// за основу взят пример https://wiki.amperka.ru/продукты:troyka-oled

var Relay = require('@amperka/relay').connect(P11); // slot D
var FlowSensor = require('@amperka/water-flow').connect(P13); // slot F, left part

var MoistSet = Math.round(100 - 100*analogRead(A0))+1; // Уставка влажности slot F, right part
var Status = 'ON'; // канал №1 включен
var MaxVol = 50; // допустимый объем за большой цикл полива

PrimaryI2C.setup({sda: SDA, scl: SCL, bitrate: 100000}); // настраиваем шину I²C, slot A+B
var Screen = require("SSD1306").connect(PrimaryI2C); // подключаем библиотеку для работы с дисплеем OLED

var IRsensor = require('@amperka/ir-receiver').connect(P9); // ИК-датчик
var IRsensorDelay = 0;
var IRsensorButton = 0;

IRsensor.on('receive', function(code) {
      IRsensorButton = 0;
  
  //Master Fedor
      if (code == 378130479) // столбец 1, ряд 1 
          { Status = 'ON';
            str1 = 'Water';
            str2 = 'is ON'; // включаем полив
            IRsensorButton = 1;
          }
      if (code == 378077439) // столбец 1, ряд 2
          { Status = 'OFF';
            str1 = 'Water';
            str2 = 'is OFF'; // выключаем полив
            IRsensorButton = 1;
          }
      if (code == 378114159) // столбец 1, ряд 3
          { if (MoistSet < 99)
            {MoistSet++; // увеличиваем уставку влажности
            }
            str1 = 'MoistSet:';
            str2 =  MoistSet.toString();
            IRsensorButton = 1;
          }
      if (code == 378097839) // столбец 1, ряд 4
          { if (MoistSet > 1)
            {MoistSet--; // уменьшаем уставку влажности
            }
            str1 = 'MoistSet:';
            str2 = MoistSet.toString();
            IRsensorButton = 1;
          }
     if (code == 378081519) // столбец 1, ряд 5
          { if (MaxVol < 99)
            {MaxVol++; // увеличиваем суточный объем
            }
            str1 = 'MaxVol:';
            str2 = MaxVol.toString();
            IRsensorButton = 1;
          }
      if (code == 378083559) // столбец 1, ряд 6
          { if (MaxVol > 2)
            {MaxVol--; // уменьшаем суточный объем
            }
            str1 = 'MaxVol:';
            str2 = MaxVol.toString();
            IRsensorButton = 1;
          }
  
  if (IRsensorButton ==1) {
  // если нажата нужная кнопка (IRsensorButton == 1), то выводим на экран измененные значения
  Screen.clear(reset); // http://www.espruino.com/Reference#l_Graphics_clear
  Screen.setFontVector(20); // выбираем размер шрифта
  Screen.drawString(str1, 0, 0); // записываем строку в буфер дисплея
  Screen.drawString(str2, 0, 30); // записываем строку в буфер дисплея
  Screen.flip(); // отображаем содержимое буфера на экране
  IRsensorDelay = 0;
  }

});

var Volume = 0; // объем поданной воды
var Moist = 0; // влажность

var count = 0; // Счетчик секунд
var BigCycle = 24*60*60*1000; // одни сутки. Устанавливаем статус в состояние 'ON'
var Cycle = 5*60*1000; // включаем полив после времени покоя
var SmallCycle = 20;
var Attempts = 0; // счетчик включений полива

// запускаем большой цикл полива
setInterval(function() {
    // print('We start another big cycle');
    FlowSensor.reset();
    Status = 'ON';
    Attempts = 0;
                        }, BigCycle);

// запускаем средний цикл полива
setInterval(function() {
    // print('We start another cycle');
    count = 0; // обнуляем счетчик секунд
      if ((Moist < MoistSet) && (Status == 'ON') && (Attempts<=10)) { // включаем полив, если влажность меньше уставки
          Relay.turnOn();
          Attempts++; // увеличиваем на единицу счетчик включений полива
      }
                      }, Cycle);

// запускаем короткий цикл полива
setInterval(function() {
      count++; // увеличиваем на единицу счетчик секунд полива
      IRsensorDelay++; // увеличиваем на единицу счетчик секунд после изменения уставки
      Volume = Math.round(10*FlowSensor.volume());
      Moist = Math.round(100 - 100*analogRead(A0));
      
      str1 = 'Status is ' + Status;
      str2 = 'Moisture: ' + Moist.toString() + '; ' + MoistSet.toString(); 
      str3 = 'Volume: ' + Volume.toString() + '; ' + MaxVol.toString();
      str4 = count.toString() + '; ' + 'Attempts: ' + Attempts.toString(); 
      print (str1 + '; ' + str2);
      print (str3 + '; ' + str4);
      print (IRsensorDelay);
      
       if (IRsensorDelay >= 5) 
      {
        Screen.clear(reset); // http://www.espruino.com/Reference#l_Graphics_clear
        Screen.setFontVector(15); // выбираем размер шрифта
        Screen.drawString(str1, 0, 0); // записываем строку в буфер дисплея
        Screen.drawString(str2, 0, 16); // записываем строку в буфер дисплея
        Screen.drawString(str3, 0, 32); // записываем строку в буфер дисплея
        Screen.drawString(str4, 0, 48); // записываем строку в буфер дисплея
        Screen.flip(); // отображаем содержимое буфера на экране
      }
  
      if ((Volume >= MaxVol) || (Moist > MoistSet+1))
          { Status = 'OFF'; // останавливаем полив, если вытекло больше MaxVol или если влажность выше уставки
          }
      if ((count >= SmallCycle) || (Status == 'OFF'))
          { Relay.turnOff(); // останавливаем полив
          }
                      }, 1000); // завершение короткого цикла