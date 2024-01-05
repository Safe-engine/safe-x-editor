import React from 'react';
import { useTranslation } from 'react-i18next';
import Typography from './Typography';

type Props = {
  label?: String;
  isRequired?: boolean;
}

const TitleSectionModal = ({ label, isRequired }: Props) => {
  const { t } = useTranslation();

  return (
    <abbr className="TitleSectionModal" title={isRequired ? t('IDS_WP_REQUIRED_LABEL') : ''}>
      <Typography component="span" className="TitleSectionModal--titleLabel">
        {label}
      </Typography>
      {isRequired && <span className="TitleSectionModal--asterisk">*</span>}
    </abbr>
  );
};

export default TitleSectionModal;
