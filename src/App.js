import React, { Component } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Switch,
} from "react-native";
import { RiDoorClosedFill, RiDoorOpenLine } from "react-icons/ri";
import { IoIosBoat } from "react-icons/io";

import Toast from "@remobile/react-native-toast";
import BluetoothSerial from "react-native-bluetooth-serial";
import { Buffer } from "buffer";
global.Buffer = Buffer;
const iconv = require("iconv-lite");

const Button = ({ label, onPress }) => (
  <TouchableOpacity style={styles.button} onPress={onPress}>
    <Text style={{ color: "#fff" }}>{label}</Text>
  </TouchableOpacity>
);

class BluetoothSerialExample extends Component {
  constructor(props) {
    super(props);
    this.state = {
      discovering: false,
      devices: [],
      connected: false,
      incendie: false,
      navire: null,
    };
  }

  componentWillMount() {
    Promise.all([BluetoothSerial.isEnabled(), BluetoothSerial.list()]).then(
      (values) => {
        const [isEnabled, devices] = values;
        this.setState({ isEnabled, devices });
      }
    );

    BluetoothSerial.on("bluetoothEnabled", () =>
      Toast.showLongBottom("Bluetooth enabled")
    );
    BluetoothSerial.on("bluetoothDisabled", () =>
      Toast.showLongBottom("Bluetooth disabled")
    );
    BluetoothSerial.on("connectionLost", () => {
      Toast.showLongBottom(
        `Connection to device ${this.state.device.name} has been lost`
      );
      this.setState({ connected: false });
    });

    BluetoothSerial.on("read", (message) => this.read(message));
  }

  /**
   * [android]
   * enable bluetooth on device
   */
  enable() {
    BluetoothSerial.enable()
      .then((res) => this.setState({ isEnabled: true }))
      .catch((err) => Toast.showLongBottom(err));
  }

  /**
   * [android]
   * disable bluetooth on device
   */
  disable() {
    BluetoothSerial.disable()
      .then((res) => this.setState({ isEnabled: false }))
      .catch((err) => Toast.showLongBottom(err));
  }

  /**
   * [android]
   * toggle bluetooth
   */
  toggleBluetooth(value) {
    if (value === true) {
      this.enable();
    } else {
      this.disable();
    }
  }

  /**
   * [android]
   * Discover unpaired devices, works only in android
   */
  discoverUnpaired() {
    if (this.state.discovering) {
      return false;
    } else {
      this.setState({ discovering: true });
      BluetoothSerial.discoverUnpairedDevices().then((unpairedDevices) => {
        const devices = this.state.devices;
        const deviceIds = devices.map((d) => d.id);
        unpairedDevices.forEach((device) => {
          if (deviceIds.indexOf(device.id) < 0) {
            devices.push(device);
          }
        });
        this.setState({ devices, discovering: false });
      });
    }
  }

  /**
   * Connect to bluetooth device by id
   * @param  {Object} device
   */
  connect(device) {
    this.setState({ connecting: true });
    BluetoothSerial.connect(device.id)
      .then((res) => {
        Toast.showLongBottom(`Connected to device ${device.name}`);
        this.setState({ device, connected: true, connecting: false });
      })
      .catch((err) => Toast.showLongBottom(err));
  }

  /**
   * Disconnect from bluetooth device
   */
  disconnect() {
    BluetoothSerial.disconnect()
      .then(() => this.setState({ connected: false }))
      .catch((err) => Toast.showLongBottom(err));
  }

  /**
   * Toggle connection when we have active device
   * @param  {Boolean} value
   */
  toggleConnect(value) {
    if (value === true && this.state.device) {
      this.connect(this.state.device);
    } else {
      this.disconnect();
    }
  }

  /**
   * Write message to device
   * @param  {String} message
   */
  read(message) {
    if (!this.state.connected) {
      Toast.showLongBottom("You must connect to device first");
    } else {
      if (message.includes("BD")) this.setState({ navire: "BD" });
      if (message.includes("TD")) this.setState({ navire: "TD" });
      if (message.includes("ATTENTION")) this.setState({ incendie: true });
    }
  }

  render() {
    if (!this.state.connected) {
      return (
        <View style={styles.container}>
          <View style={{ backgroundColor: "#eee" }}>
            {Platform.OS === "android" ? (
              <View style={styles.enableInfoWrapper}>
                <Text style={{ fontWeight: "bold" }}>ENABLE BT</Text>
                <Switch
                  onValueChange={this.toggleBluetooth.bind(this)}
                  value={this.state.isEnabled}
                />
              </View>
            ) : null}
          </View>

          <View style={styles.connectionInfoWrapper}>
            <View>
              <Switch
                onValueChange={this.toggleConnect.bind(this)}
                disabled={!this.state.device}
                value={this.state.connected || this.state.connecting}
              />
            </View>
            <View>
              {this.state.connected ? (
                <Text style={styles.connectionInfo}>
                  ✓ Connected to {this.state.device.name}
                </Text>
              ) : (
                <Text style={[styles.connectionInfo, { color: "#ff6523" }]}>
                  ✗ Not connected to any device
                </Text>
              )}
            </View>
          </View>

          <Text style={{ alignSelf: "center" }}>Bluetooth devices</Text>
          <View style={styles.listContainer}>
            {this.state.devices.map((device, i) => {
              return (
                <TouchableOpacity
                  key={`${device.id}_${i}`}
                  style={styles.listItem}
                  onPress={this.connect.bind(this, device)}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ fontWeight: "bold" }}>{device.name}</Text>
                    <Text>{`<${device.id}>`}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "center" }}>
            {Platform.OS === "android" ? (
              <Button
                label={
                  this.state.discovering
                    ? "... Discovering"
                    : "Discover devices"
                }
                onPress={this.discoverUnpaired.bind(this)}
              />
            ) : null}
          </View>
        </View>
      );
    } else {
      <View style={styles.container}>
        <View>
          <Text style={styles.heading}>Incendie </Text>
          <Image
            style={styles.image}
            source={this.state.incendie ? RiDoorOpenLine : RiDoorClosedFill}
          />
        </View>
        <View>
          <Text style={styles.heading}>Navire sur {this.state.navire} </Text>
          <Image
            style={
              this.state.navire
                ? this.state.navire == "BD"
                  ? [styles.image, styles.BD]
                  : [styles.image, styles.TD]
                : styles.image
            }
            source={IoIosBoat}
          />
        </View>
      </View>;
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5FCFF",
  },
  heading: {
    fontWeight: "bold",
    fontSize: 24,
    marginVertical: 10,
    alignSelf: "center",
  },
  enableInfoWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    height: 40,
    paddingHorizontal: 25,
    alignItems: "center",
  },
  connectionInfoWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 25,
  },
  connectionInfo: {
    fontWeight: "bold",
    alignSelf: "center",
    fontSize: 18,
    marginVertical: 10,
    color: "#238923",
  },
  listContainer: {
    marginTop: 15,
    borderColor: "#ccc",
    borderTopWidth: 0.5,
  },
  listItem: {
    flex: 1,
    padding: 25,
    borderColor: "#ccc",
    borderBottomWidth: 0.5,
  },
  button: {
    margin: 5,
    padding: 25,
    backgroundColor: "#4C4C4C",
  },
  image: {
    flex: 1,
    resizeMode: "cover",
    margin: 10,
  },
  BD: {
    transform: [{ rotate: "-8deg" }],
  },
  TD: {
    transform: [{ rotate: "8deg" }],
  },
});

export default BluetoothSerialExample;
