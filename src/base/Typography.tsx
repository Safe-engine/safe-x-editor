import React, { ReactNode } from 'react';

type Props = {
  component?: String;
  className?: String;
  children: ReactNode;
  variant?: String;
  fullWidth?: boolean;
}

const Typography = ({
  component, className, variant, fullWidth, children
}: Props) => {

  return (
    <div className="p-2">
      {children}
    </div>
  );
};

export default Typography;
