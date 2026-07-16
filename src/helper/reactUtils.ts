export const handleChange = (setter) => (evt) => {
  setter(evt.target.value);
};

export const handleCheck = (setter) => (evt) => {
  setter(evt.target.checked);
};