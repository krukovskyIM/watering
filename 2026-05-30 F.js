// // Settings --> Communications --> Module URL --> | https://www.espruino.com/modules | https://banglejs.com/apps/modules | https://js.amperka.ru/modules


// за основу взят пример https://wiki.amperka.ru/yodo#сканер_ик-пультов
// за основу взят пример https://wiki.amperka.ru/продукты:troyka-oled

var Relay = require('@amperka/relay').connect(P11); // slot D
var FlowSensor = require('@amperka/water-flow').connect(P13); // slot F, left part

var MoistSet = Math.round(100 - 100*analogRead(A0))+10; // Уставка влажности
	if (MoistSet > 99)
            {MoistSet = 99;
            }
var Status = 'ON'; // канал №1 включен
var MaxVol = 100; // начальный допустимый объем за большой цикл полива
var MaxAttempts = Math.round(MaxVol/10)+1; // число включений полива за большой цикл
var SoftVer = 'May 2026'; // дата обновления ПО

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
          { MaxVol++; // увеличиваем суточный объем
            MaxAttempts = Math.round(MaxVol/10)+1; // число включений полива за большой цикл
	          str1 = 'MaxVol: ' + MaxVol.toString();
            str2 = 'MaxAtt: ' + MaxAttempts.toString();
            IRsensorButton = 1;
          }
      if (code == 378083559) // столбец 1, ряд 6
          { if (MaxVol > 2)
            {MaxVol--; // уменьшаем суточный объем
             MaxAttempts = Math.round(MaxVol/10)+1; // число включений полива за большой цикл
            }
            str1 = 'MaxVol: ' + MaxVol.toString();
            str2 = 'MaxAtt: ' + MaxAttempts.toString();
            IRsensorButton = 1;
          }
  
  if (IRsensorButton ==1) {
  // если нажата нужная кнопка (IRsensorButton == 1), то выводим на экран измененные значения
  Screen.clear(reset); // http://www.espruino.com/Reference#l_Graphics_clear
  Screen.setFontVector(20); // выбираем размер шрифта
  Screen.drawString(str1, 0, 0); // записываем название переменной в буфер дисплея
  Screen.drawString(str2, 0, 22); // записываем значение переменной в буфер дисплея
  Screen.setFontVector(15); // выбираем размер шрифта
  Screen.drawString(SoftVer, 0, 49); // записываем версию ПО в буфер дисплея
  Screen.flip(); // отображаем содержимое буфера на экране
  IRsensorDelay = 0;
  }

});

var Volume = 0; // объем поданной воды
var Count = 0; // Счетчик секунд в Cycle
var BigCycle = 24*60*60; // одни сутки. Устанавливаем статус в состояние 'ON'
var BigCount = 0; // счетчик секунд в сутках
var Cycle = 5*60; // время покоя + время полива
var SmallCycle = 20;
var Attempts = 0; // счетчик включений полива
var p1 = 0; // процент времени, врошедшего от начала Cycle
var p2 = 0; // процент времени, врошедшего от начала суток

// запускаем большой цикл полива
setInterval(function() {
   
   str1 = 'We start ';   
   str2 = 'another ';   
   str3 = 'big cycle';   
   Screen.clear(reset); // http://www.espruino.com/Reference#l_Graphics_clear
   Screen.setFontVector(15); // выбираем размер шрифта
   Screen.drawString(str1, 0, 0); // записываем строку в буфер дисплея
   Screen.drawString(str2, 0, 16); // записываем строку в буфер дисплея
   Screen.drawString(str3, 0, 32); // записываем строку в буфер дисплея
   Screen.flip(); // отображаем содержимое буфера на экране
   
    Status = 'ON';
    Attempts = 0;
    Volume = 0;
    FlowSensor.reset();
    BigCount = 0;
    print (str1 + str2 + str3);
    print ('');
                        }, BigCycle*1000);

// запускаем средний цикл полива
setInterval(function() {
   
   str1 = 'We start ';   
   str2 = 'another ';   
   str3 = 'cycle';   
   Screen.clear(reset); // http://www.espruino.com/Reference#l_Graphics_clear
   Screen.setFontVector(15); // выбираем размер шрифта
   Screen.drawString(str1, 0, 0); // записываем строку в буфер дисплея
   Screen.drawString(str2, 0, 16); // записываем строку в буфер дисплея
   Screen.drawString(str3, 0, 32); // записываем строку в буфер дисплея
   Screen.flip(); // отображаем содержимое буфера на экране
   print (str1 + str2 + str3);
   print ('');

    Count = 0; // обнуляем счетчик секунд, в течение которых открыт клапан
    if ((Moist < MoistSet) && (Status == 'ON') && (Attempts <= MaxAttempts)) { // включаем полив, если влажность меньше уставки или есть неизрасходованное число попыток полива
          Relay.turnOn();
          Attempts++; // увеличиваем на единицу счетчик включений полива
      }
                      }, Cycle*1000); // завершение цикла покоя и полива

// запускаем короткий цикл полива
setInterval(function() {
      Count++; // увеличиваем на единицу счетчик секунд полива
      BigCount++;  // увеличиваем на единицу счетчик секунд, прошедших с начала суток
      IRsensorDelay++; // увеличиваем на единицу счетчик секунд после изменения уставки
      Volume = Math.round(10*FlowSensor.volume());
      Moist = Math.round(100 - 100*analogRead(A0));
      p1 = Math.round(100*Count/Cycle); // процент времени, прошедшего от состояния покоя
      p2 = Math.round(100*BigCount/BigCycle); // процент времени, прошедшего от начала суток
      
      str1 = 'Status is ' + Status;
      str2 = 'Moisture: ' + Moist.toString() + '; ' + MoistSet.toString(); 
      str3 = 'Volume: ' + Volume.toString() + '; ' + MaxVol.toString();
      str4 = p1.toString() + '; ' + p2.toString() + '; ' + Attempts.toString() + '/ ' + MaxAttempts.toString(); 
      print (str1 + '; ' + str2);
      print (str3 + '; ' + str4);
      
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
      if ((Volume >= MaxVol) || (Moist > MoistSet))
          { Status = 'OFF'; // останавливаем полив, если вытекло больше MaxVol или если влажность выше уставки
          }
      if ((Count >= SmallCycle) || (Status == 'OFF'))
          { Relay.turnOff(); // останавливаем полив
          }
                      }, 1000); // завершение короткого цикла