import { StyleSheet } from "react-native";

export const sharedStyles = StyleSheet.create({
  page: { 
    flex: 1 
  },
  content: { 
    padding: 16 
  },
  title: { 
    fontSize: 24, 
    fontWeight: "700" 
  },
  button: { 
    marginTop: 20, 
    borderRadius: 14, 
    paddingVertical: 12, 
    paddingHorizontal: 14, 
    alignSelf: "flex-start" 
  },
  buttonText: { 
    color: "white", 
    fontWeight: "700" 
  }
});
