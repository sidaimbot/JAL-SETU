# JAL-SETU 🌊

**Autonomous Disaster-Resilient Early Warning System for Flood Management**

![GitHub License](https://img.shields.io/badge/license-MIT-blue.svg)
![JavaScript](https://img.shields.io/badge/language-JavaScript%20%7C%20Python-yellow.svg)
![Status](https://img.shields.io/badge/status-Active%20Development-green.svg)

## 📋 Overview

JAL-SETU is an intelligent early warning system designed to protect communities and assist rescue operations during flood disasters. Developed by Team CODIO TEX at Haridwar University, this system operates **completely independently** of internet and cellular infrastructure, making it ideal for disaster-prone remote areas.

### 🎯 Key Features

- **📡 Autonomous Operation**: Works without internet or cellular connectivity
- **⚠️ Real-time Alerts**: Immediate flood risk notifications
- **🌐 Wide Coverage**: Mesh networking for extended range
- **🤖 ML-Powered**: Machine learning for accurate flood prediction
- **📊 Live Dashboard**: Real-time monitoring and data visualization
- **🔋 IoT Integration**: Hardware sensors for water level monitoring
- **🛡️ Disaster Resilient**: Engineered to function during emergencies

---

## 🏗️ Project Structure

```
JAL-SETU/
├── JalSetu-ML/              # Machine Learning models for flood prediction
├── JalSetu_Node/            # IoT Node firmware and hardware integration
├── jal-setu-dashboard/      # Web dashboard for monitoring
├── package.json             # Project dependencies
└── README.md                # This file
```

### 📁 Component Overview

| Component | Purpose | Technologies |
|-----------|---------|--------------|
| **JalSetu-ML** | Predictive flood analysis | Python, ML Models |
| **JalSetu_Node** | IoT sensor hardware interface | Firmware, Embedded Systems |
| **jal-setu-dashboard** | Real-time monitoring interface | JavaScript, React/Vue |

---

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- Python 3.8+
- Git
- Hardware sensors (water level, temperature, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sidaimbot/JAL-SETU.git
   cd JAL-SETU
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the ML environment** (Python)
   ```bash
   pip install -r JalSetu-ML/requirements.txt
   ```

4. **Configure the IoT Nodes**
   ```bash
   cd JalSetu_Node
   # Follow hardware setup instructions in JalSetu_Node/README.md
   ```

5. **Start the dashboard**
   ```bash
   cd jal-setu-dashboard
   npm install
   npm start
   ```

---

## 📦 Components in Detail

### 🤖 Machine Learning (`JalSetu-ML/`)
Predictive models for flood risk assessment
- Water level forecasting
- Rainfall pattern analysis
- Real-time risk classification

### 📡 IoT Nodes (`JalSetu_Node/`)
Hardware integration and sensor management
- Water level sensors
- Temperature monitoring
- Wireless mesh communication
- Local data processing

### 📊 Dashboard (`jal-setu-dashboard/`)
Web-based monitoring and control center
- Real-time data visualization
- Alert management
- Historical data analysis
- User notifications

---

## 🔧 Configuration

Create a `.env` file in the root directory:

```env
# Sensor Configuration
SENSOR_PORT=/dev/ttyUSB0
SENSOR_BAUDRATE=9600

# ML Model Settings
MODEL_PATH=./JalSetu-ML/models/
PREDICTION_INTERVAL=300

# Dashboard Settings
DASHBOARD_PORT=3000
DASHBOARD_HOST=localhost

# Mesh Network
MESH_CHANNEL=15
MESH_SSID=JalSetu-Network
```

---

## 🎮 Usage

### Running the System

```bash
# Start IoT nodes
cd JalSetu_Node
npm start

# Start ML prediction engine
cd JalSetu-ML
python main.py

# Start dashboard (in another terminal)
cd jal-setu-dashboard
npm start
```

### Monitoring Alerts

The dashboard provides:
- Live water level tracking
- Flood risk predictions
- Historical trends
- Alert notifications

---

## 📊 Data Flow

```
Sensors → IoT Nodes → ML Engine → Dashboard → Alerts
   ↓          ↓            ↓           ↓
 Water    Processing    Prediction   Notify
 Level                  & Analysis    Users
```

---

## 🛠️ Hardware Requirements

- **Water Level Sensors**: Ultrasonic or capacitive sensors
- **Microcontroller**: Arduino, ESP32, or Raspberry Pi
- **Communication**: LoRa or Wi-Fi mesh modules
- **Power**: Battery backup system
- **Data Logger**: SD card module (optional)

---

## 📚 Documentation

- [ML Models Documentation](./JalSetu-ML/README.md)
- [IoT Node Setup Guide](./JalSetu_Node/README.md)
- [Dashboard User Guide](./jal-setu-dashboard/README.md)
- [API Reference](./docs/API.md) *(coming soon)*
- [Hardware Setup](./docs/HARDWARE.md) *(coming soon)*

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Contribution Areas
- [ ] ML model improvements
- [ ] Hardware optimization
- [ ] Dashboard enhancements
- [ ] Documentation
- [ ] Bug fixes
- [ ] Testing

---

## 🐛 Bug Reports & Issues

Found a bug? Have a suggestion? [Open an issue](https://github.com/sidaimbot/JAL-SETU/issues) and provide:
- Clear description
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots (if applicable)

---

## 📈 Development Roadmap

- [ ] Real-time data streaming
- [ ] Mobile app integration
- [ ] Advanced ML models
- [ ] Multi-language support
- [ ] API documentation
- [ ] Unit tests & CI/CD pipeline
- [ ] Production deployment guide

---

## ⚖️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

**JAL-SETU** developed by **Team CODIO TEX** at Haridwar University

---

## 📞 Support & Contact

- 📧 Email: [contact@jalsetu.com] *(update with your email)*
- 🐙 GitHub: [@sidaimbot](https://github.com/sidaimbot)
- 📝 Issues: [Report here](https://github.com/sidaimbot/JAL-SETU/issues)

---

## 🙏 Acknowledgments

- Haridwar University for support and resources
- All contributors and community members
- Flood management authorities for guidance
- Open-source communities for tools and libraries

---

## ⭐ Show Your Support

If JAL-SETU helps you, please consider:
- ⭐ Starring this repository
- 🔗 Sharing with others
- 💬 Providing feedback
- 🤝 Contributing code

---

**Together, we can save lives during disasters.** 🌊💙

---

*Last Updated: 2026-05-01*
