function registerGenerators(Blockly) {

    // --- 1. HÀM KHỞI TẠO (INIT) ---
    // Đã bao gồm Driver PCA9685 tự viết (không cần thư viện Adafruit)
    Blockly.Arduino.thingBotC3_init = function () {
        Blockly.Arduino.includes_.thingBot_pwmInit = `#include <Wire.h>`;

        // Định nghĩa chân
        Blockly.Arduino.definitions_['define_M1_A'] = '#define M1_A 2';
        Blockly.Arduino.definitions_['define_M1_B'] = '#define M1_B 3';
        Blockly.Arduino.definitions_['define_M2_A'] = '#define M2_A 4';
        Blockly.Arduino.definitions_['define_M2_B'] = '#define M2_B 5';
        Blockly.Arduino.definitions_['define_M3_A'] = '#define M3_A 7';
        Blockly.Arduino.definitions_['define_M3_B'] = '#define M3_B 6';
        Blockly.Arduino.definitions_['define_M4_A'] = '#define M4_A 1';
        Blockly.Arduino.definitions_['define_M4_B'] = '#define M4_B 0';

        Blockly.Arduino.definitions_['define_SERVO_1'] = '#define SERVO_1 12';
        Blockly.Arduino.definitions_['define_SERVO_2'] = '#define SERVO_2 11';
        Blockly.Arduino.definitions_['define_SERVO_3'] = '#define SERVO_3 10';
        Blockly.Arduino.definitions_['define_SERVO_4'] = '#define SERVO_4 9';
        Blockly.Arduino.definitions_['define_SERVO_5'] = '#define SERVO_5 8';

        Blockly.Arduino.definitions_['define_buzzer_pin'] = '#define BUZZER 14';
        Blockly.Arduino.definitions_['define_switch_pin'] = '#define SW 3';
        Blockly.Arduino.definitions_['define_LED_1_pin'] = '#define LED_1 15';
        Blockly.Arduino.definitions_['define_LED_2_pin'] = '#define LED_2 13';

        // DRIVER PCA9685 TỰ VIẾT (Lightweight)
        Blockly.Arduino.definitions_['driver_pca9685_custom'] = `
#define PCA9685_ADDR 0x40

void writePCA9685(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(PCA9685_ADDR);
  Wire.write(reg);
  Wire.write(val);
  Wire.endTransmission();
}

void setPWM(uint8_t num, uint16_t on, uint16_t off) {
  Wire.beginTransmission(PCA9685_ADDR);
  Wire.write(0x06 + 4 * num);
  Wire.write(on & 0xFF);
  Wire.write(on >> 8);
  Wire.write(off & 0xFF);
  Wire.write(off >> 8);
  Wire.endTransmission();
}

void initPCA9685() {
  Wire.begin();
  writePCA9685(0x00, 0x10); // Sleep
  writePCA9685(0xFE, 121);  // Prescale 50Hz
  writePCA9685(0x00, 0x20); // Auto-increment
  delay(10);
}

void setServoAngle(uint8_t channel, int angle) {
  int pulse = map(constrain(angle, 0, 180), 0, 180, 150, 600);
  setPWM(channel, 0, pulse);
}

int mapToPulse(int value) {
    return map(constrain(value, 0, 100), 0, 100, 0, 4095);
}
`;
        // Nếu bạn dùng MPU6050 Light thì thêm initMPU6050() vào return bên dưới
        return 'initPCA9685();\npinMode(SW, INPUT);\n';
    };

    // --- 2. ĐỘNG CƠ (MOTOR) ---
    Blockly.Arduino.thingBotC3_setMotor = function (block) {
        const motor = block.getFieldValue('MOTOR');
        const speed = Blockly.Arduino.valueToCode(block, 'SPEED', Blockly.Arduino.ORDER_ATOMIC) || '0';
        const direction = block.getFieldValue('DIRECTION');

        // Đã sửa: Dùng setPWM thay vì pwm.setPWM
        if (direction == 'forward') {
            return `setPWM(M${motor}_A, 0, 0);\nsetPWM(M${motor}_B, 0, mapToPulse(${speed}));\n`;
        } else {
            return `setPWM(M${motor}_A, 0, mapToPulse(${speed}));\nsetPWM(M${motor}_B, 0, 0);\n`;
        }
    };

    // --- 3. SERVO ---
    Blockly.Arduino.thingBotC3_setServo = function (block) {
        const servo = block.getFieldValue('SERVO');
        // Lưu ý: Đảm bảo tên biến khớp với Block Definition (ANGLE hoặc PULSE)
        const angle = Blockly.Arduino.valueToCode(block, 'ANGLE', Blockly.Arduino.ORDER_ATOMIC) || '0';
        
        return `setServoAngle(SERVO_${servo}, ${angle});\n`;
    };

    // --- 4. BUZZER ---
    Blockly.Arduino.thingBotC3_buzzer = function (block) {
        const sound = Blockly.Arduino.valueToCode(block, 'SOUND', Blockly.Arduino.ORDER_ATOMIC) || '0';
        
        // Đã sửa: Dùng setPWM thay vì pwm.setPin
        // Nếu sound là ON/OFF (0/1) hoặc 0-4095, lệnh này đều chạy tốt
        return `setPWM(BUZZER, 0, ${sound});\n`;
    };

    // --- 5. LED ---
    Blockly.Arduino.thingBotC3_setLed = function (block) {
        const led = block.getFieldValue('LED');
        const brightness = Blockly.Arduino.valueToCode(block, 'BRIGHTNESS', Blockly.Arduino.ORDER_ATOMIC) || '0';

        // Đã sửa: Dùng setPWM thay vì pwm.setPin
        // mapToPulse sẽ chuyển 0-100 thành 0-4095
        return `setPWM(${led}, 0, mapToPulse(${brightness}));\n`;
    };

    // --- 6. PS2 CONTROLLER ---
    Blockly.Arduino.thingBotC3_initPS2 = function () {
        Blockly.Arduino.includes_.thingBot_ps2Init = `#include <PS2X_lib.h>`;
        
        // Kiểm tra lại chân GPIO cho đúng với ESP32-C3
        Blockly.Arduino.definitions_['define_PS2_pin'] = `
#define PS2_DAT 7
#define PS2_CMD 2
#define PS2_SEL 10
#define PS2_CLK 6
#define pressures false
#define rumble false
`;
        Blockly.Arduino.definitions_.thing_ps2Init = `PS2X ps2x;`;
        
        // Code setup PS2
        // Lưu ý: Vòng lặp while này sẽ làm treo robot nếu không gắn tay cầm
        // Nếu muốn an toàn hơn, có thể thêm break sau số lần thử nhất định
        return `
  int error = 1;
  int tryNum = 0;
  while (error != 0 && tryNum < 10) { // Thử tối đa 10 lần rồi bỏ qua để tránh treo
    delay(200);
    error = ps2x.config_gamepad(PS2_CLK, PS2_CMD, PS2_SEL, PS2_DAT, pressures, rumble);
    tryNum++;
  }
`;
    };

    // --- 7. SWITCH ---
    Blockly.Arduino.thingBotC3_switch = function () {
        // Logic này đúng rồi, trả về true/false
        const code = `!digitalRead(SW)`;
        return [code, Blockly.Arduino.ORDER_ATOMIC];
    };

    return Blockly;
}

exports = registerGenerators;