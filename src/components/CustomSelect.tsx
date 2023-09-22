import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import React, { useCallback, useMemo, useRef } from 'react';

import { formatValue, parsePartArray, partToString } from '../converter';
import { DEFAULT_LOCALE_EN } from '../locale';
import { Clicks, CustomSelectProps } from '../types';
import { classNames, sort } from '../utils';

export default function CustomSelect(props: CustomSelectProps) {
  const {
    value,
    optionsList,
    setValue,
    locale,
    className,
    humanizeLabels,
    disabled,
    readOnly,
    leadingZero,
    clockFormat,
    unit,
    periodicityOnDoubleClick,
    mode,
    allowClear,
    filterOption = () => true,
    placeholder,
    panelHeaderTemplate = (<></>),
    panelFooterTemplate = (<></>),
    ...otherProps
  } = props;

  const stringValue = useMemo(() => {
    if (value && Array.isArray(value)) {
      return value.map((value: number) => value.toString());
    }
  }, [value]);

  const stringValueSingleMode = useMemo(() => {
    if (value && Array.isArray(value)) {
      return value.length ? value[0].toString() : undefined;
    }
  }, [value]);

  const options = useMemo(
    () => {
      if (optionsList) {
        return optionsList.map((option, index) => {
          const number = unit.min === 0 ? index : index + 1;

          return {
            value: number.toString(),
            label: option,
          };
        });
      }

      return [...Array(unit.total)]
        .map((_, index) => {
          const number = unit.min === 0 ? index : index + 1;

          return {
            value: number.toString(),
            label: formatValue(
              number,
              unit,
              humanizeLabels,
              leadingZero,
              clockFormat,
            ),
          };
        })
        .filter(filterOption);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [optionsList, leadingZero, humanizeLabels, clockFormat],
  );
  const localeJSON = JSON.stringify(locale);
  const renderTag = useCallback(
    (itemValue: string) => {
      if (!value?.length) {
        return <>{placeholder}</>
      }
      if (!value || value[0] !== Number(itemValue)) {
        return <></>;
      }

      const parsedArray = parsePartArray(value, unit);
      const cronValue = partToString(
        parsedArray,
        unit,
        humanizeLabels,
        leadingZero,
        clockFormat,
      );
      const testEveryValue = cronValue.match(/^\*\/([0-9]+),?/) || [];

      return (
        <>
          {testEveryValue[1]
            ? `${locale.everyText || DEFAULT_LOCALE_EN.everyText} ${testEveryValue[1]
            }`
            : cronValue}
        </>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, localeJSON, humanizeLabels, leadingZero, clockFormat],
  );

  const simpleClick = useCallback(
    (newValueOption: number | number[]) => {
      const newValueOptions = Array.isArray(newValueOption)
        ? sort(newValueOption)
        : [newValueOption];
      let newValue: number[] = newValueOptions;

      if (value) {
        newValue = mode === 'single' ? [] : [...value];

        newValueOptions.forEach((o) => {
          const newValueOptionNumber = Number(o);

          if (value.some((v) => v === newValueOptionNumber)) {
            newValue = newValue.filter((v) => v !== newValueOptionNumber);
          } else {
            newValue = sort([...newValue, newValueOptionNumber]);
          }
        });
      }

      if (newValue.length === unit.total) {
        setValue([]);
      } else {
        setValue(newValue);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setValue, value],
  );

  const doubleClick = useCallback(
    (newValueOption: number) => {
      if (newValueOption !== 0 && newValueOption !== 1) {
        const limit = unit.total + unit.min;
        const newValue: number[] = [];

        for (let i = unit.min; i < limit; i++) {
          if (i % newValueOption === 0) {
            newValue.push(i);
          }
        }
        const oldValueEqualNewValue = value
          && newValue
          && value.length === newValue.length
          && value.every((v: number, i: number) => v === newValue[i]);
        const allValuesSelected = newValue.length === options.length;

        if (allValuesSelected) {
          setValue([]);
        } else if (oldValueEqualNewValue) {
          setValue([]);
        } else {
          setValue(newValue);
        }
      } else {
        setValue([]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, options, setValue],
  );

  // Used by the select clear icon
  const onClear = useCallback(() => {
    if (!readOnly) {
      setValue([]);
    }
  }, [setValue, readOnly]);

  const clicksRef = useRef<Clicks[]>([]);
  const onSelectValue = useCallback(
    (newValueOption: string | undefined) => {
      if (!newValueOption) {
        onClear();
        return;
      }

      if (!readOnly) {
        const doubleClickTimeout = 300;
        const clicks = clicksRef.current;

        clicks.push({
          time: new Date().getTime(),
          value: Number(newValueOption),
        });

        const id = window.setTimeout(() => {
          if (
            periodicityOnDoubleClick
            && clicks.length > 1
            && clicks[clicks.length - 1].time - clicks[clicks.length - 2].time
            < doubleClickTimeout
          ) {
            if (
              clicks[clicks.length - 1].value
              === clicks[clicks.length - 2].value
            ) {
              doubleClick(Number(newValueOption));
            } else {
              simpleClick([
                clicks[clicks.length - 2].value,
                clicks[clicks.length - 1].value,
              ]);
            }
          } else {
            simpleClick(Number(newValueOption));
          }

          clicksRef.current = [];
        }, doubleClickTimeout);

        return () => {
          window.clearTimeout(id);
        };
      }
    },
    [clicksRef, simpleClick, doubleClick, readOnly, periodicityOnDoubleClick, onClear],
  );

  const onOptionClick = (selectedValues: string[]) => {
    if (!value?.length) {
      onSelectValue(selectedValues[0]);
      return;
    }
    if (selectedValues.length > value?.length) {
      onSelectValue(selectedValues[selectedValues.length - 1])
    } else {
      const numberValues = selectedValues.map(i => Number(i));
      const newValue = value.filter(i => !numberValues.includes(i))
      onSelectValue(String(newValue[0]))
    }
  }

  const internalClassName = useMemo(
    () =>
      classNames({
        'react-js-cron-select': true,
        'react-js-cron-custom-select': true,
        [`${className}-select`]: !!className,
      }),
    [className]
  )

  return (
    <>
      {
        mode === 'single' && !periodicityOnDoubleClick ? (
          <Dropdown
            showClear={allowClear ?? !readOnly}
            value={stringValueSingleMode}
            onChange={(e) => onSelectValue(e.value)}
            options={options}
            placeholder={placeholder as string}
            dropdownIcon={(disabled || readOnly) ? 'pi' : undefined}
            disabled={disabled || readOnly}
            data-testid={`custom-select-${unit.type}`}
            className={internalClassName}
            panelFooterTemplate={panelFooterTemplate}
            {...otherProps}
          />
        ) : (
          <MultiSelect
            showClear={allowClear ?? !readOnly}
            value={stringValue}
            onChange={(e) => onOptionClick(e.value)}
            showSelectAll={false}
            panelHeaderTemplate={panelHeaderTemplate}
            selectedItemTemplate={renderTag}
            options={options}
            placeholder={placeholder as string}
            dropdownIcon={(disabled || readOnly) ? 'pi' : undefined}
            disabled={disabled || readOnly}
            data-testid={`custom-select-${unit.type}`}
            className={internalClassName}
            panelFooterTemplate={panelFooterTemplate}
            {...otherProps}
          />
        )
      }
    </>
  );
}
