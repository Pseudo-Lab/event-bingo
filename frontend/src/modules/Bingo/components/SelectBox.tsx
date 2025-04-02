import { BorderColor } from "@mui/icons-material";
import {
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  SelectChangeEvent,
} from "@mui/material";
import { styled } from "@mui/system";

interface SelectBoxProps {
  label: string;
  value: string;
  onChange: (event: SelectChangeEvent<string>) => void; // Corrected type for event
  options: string[];
}

const SelectBox = (props: SelectBoxProps) => {
  return (
    <FormControl fullWidth>
      <InputLabel>{props.label}</InputLabel>
      <Select
        value={props.value}
        label={props.label}
        onChange={props.onChange}
        sx={{ marginTop: "1rem" }}
      >
        {props.options.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default SelectBox;
